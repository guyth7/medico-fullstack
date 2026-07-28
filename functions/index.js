'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

initializeApp();

const auth = getAuth();
const db = getFirestore();
const NATIONAL_ID_PATTERN = /^\d{11}$/;
const STAFF_ROLES = new Set(['doctor', 'hospital', 'laboratory', 'pharmacy']);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStaffRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return STAFF_ROLES.has(role) ? role : null;
}

function staffApprovalDocumentId(email) {
  return encodeURIComponent(normalizeEmail(email));
}

function normalizeNationalId(value) {
  return String(value || '').trim();
}

function assertValidVerificationRecord(record, authenticatedUid) {
  if (!record) {
    throw new HttpsError('failed-precondition', 'Identity verification has not been completed.');
  }

  if (record.uid !== authenticatedUid) {
    throw new HttpsError('permission-denied', 'The verification record does not belong to this account.');
  }

  if (record.status !== 'verified') {
    throw new HttpsError('failed-precondition', 'Identity verification is not approved.');
  }

  const nationalId = normalizeNationalId(record.national_id);
  if (!NATIONAL_ID_PATTERN.test(nationalId)) {
    throw new HttpsError('failed-precondition', 'The verified national ID has an invalid format.');
  }

  if (!record.verified_at || !record.verified_by) {
    throw new HttpsError('failed-precondition', 'The verification record is incomplete.');
  }

  return nationalId;
}

async function findUniquePatientByNationalId(nationalId) {
  const [canonicalSnapshot, legacySnapshot] = await Promise.all([
    db.collection('patients').where('national_id', '==', nationalId).limit(2).get(),
    db.collection('patients').where('nationalId', '==', nationalId).limit(2).get(),
  ]);
  const documents = [...new Map(
    [...canonicalSnapshot.docs, ...legacySnapshot.docs]
      .map((document) => [document.ref.path, document])
  ).values()];
  return documents.length === 1 ? documents[0] : null;
}

async function findUniquePatientAccountByNationalId(nationalId) {
  const [canonicalSnapshot, legacySnapshot] = await Promise.all([
    db.collection('users').where('national_id', '==', nationalId).limit(3).get(),
    db.collection('users').where('nationalId', '==', nationalId).limit(3).get(),
  ]);
  const documents = [...new Map(
    [...canonicalSnapshot.docs, ...legacySnapshot.docs]
      .map((document) => [document.ref.path, document])
  ).values()].filter((document) => {
    const data = document.data();
    return String(data.role || data.account_type || '').toLowerCase() === 'patient';
  });

  const accounts = documents.map((document) => {
    const data = document.data();
    return {
      document,
      uid: String(data.uid || data.userId || data.auth_uid || '').trim(),
    };
  }).filter((account) => account.uid);

  return accounts.length === 1 ? accounts[0] : null;
}

async function reconcilePatientLink(nationalId, source) {
  if (!NATIONAL_ID_PATTERN.test(nationalId)) return false;

  const [patientDocument, patientAccount] = await Promise.all([
    findUniquePatientByNationalId(nationalId),
    findUniquePatientAccountByNationalId(nationalId),
  ]);
  if (!patientDocument || !patientAccount) return false;

  const patientData = patientDocument.data();
  if (patientData.patient_auth_uid === patientAccount.uid) return true;
  if (patientData.patient_auth_uid && patientData.patient_auth_uid !== patientAccount.uid) {
    console.error(`Patient ending in ${nationalId.slice(-4)} is linked to a different account.`);
    return false;
  }

  const user = await auth.getUser(patientAccount.uid);
  const existingClaims = user.customClaims || {};
  if (['doctor', 'staff'].includes(existingClaims.account_type) || existingClaims.admin === true) {
    console.error(`Refusing to link privileged account ${patientAccount.uid}.`);
    return false;
  }

  await auth.setCustomUserClaims(patientAccount.uid, {
    ...existingClaims,
    national_id: nationalId,
    account_type: 'patient',
  });
  await patientDocument.ref.set({
    national_id: nationalId,
    nationalId,
    patient_auth_uid: patientAccount.uid,
    identity_linked_at: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection('claim_assignment_audit').add({
    uid: patientAccount.uid,
    patient_document_id: patientDocument.id,
    action: 'patient_claim_assigned',
    source,
    account_type: 'patient',
    national_id_last_four: nationalId.slice(-4),
    assigned_at: FieldValue.serverTimestamp(),
  });
  return true;
}

exports.finalizePatientOnboarding = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: true,
    consumeAppCheckToken: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Firebase Authentication is required.');
    }

    const uid = request.auth.uid;
    const verificationSnapshot = await db.doc(`identity_verifications/${uid}`).get();
    if (!verificationSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'No verified identity record was found.');
    }

    const nationalId = assertValidVerificationRecord(verificationSnapshot.data(), uid);
    const user = await auth.getUser(uid);
    const existingClaims = user.customClaims || {};

    // Privileged identities must never be silently converted into patients.
    if (['doctor', 'staff'].includes(existingClaims.account_type) || existingClaims.admin === true) {
      throw new HttpsError(
        'failed-precondition',
        'A privileged staff account cannot be converted into a patient account.'
      );
    }

    const canonicalSnapshot = await db.collection('patients')
      .where('national_id', '==', nationalId)
      .limit(2)
      .get();

    const legacySnapshot = await db.collection('patients')
      .where('nationalId', '==', nationalId)
      .limit(2)
      .get();

    // Query both migration fields and de-duplicate documents that contain both.
    const matchingDocuments = [...new Map(
      [...canonicalSnapshot.docs, ...legacySnapshot.docs]
        .map((document) => [document.ref.path, document])
    ).values()];

    if (matchingDocuments.length === 0) {
      throw new HttpsError('not-found', 'No medical record matches the verified identity.');
    }

    if (matchingDocuments.length > 1) {
      throw new HttpsError('failed-precondition', 'Multiple patient records use this national ID.');
    }

    const patientDocument = matchingDocuments[0];
    const patientData = patientDocument.data();
    if (
      patientData.national_id
      && patientData.nationalId
      && patientData.national_id !== patientData.nationalId
    ) {
      throw new HttpsError('data-loss', 'The patient record contains conflicting national ID fields.');
    }

    if (patientData.patient_auth_uid && patientData.patient_auth_uid !== uid) {
      throw new HttpsError('already-exists', 'This patient record is already linked to another account.');
    }

    await auth.setCustomUserClaims(uid, {
      ...(user.customClaims || {}),
      national_id: nationalId,
      account_type: 'patient',
    });

    await patientDocument.ref.update({
      national_id: nationalId,
      nationalId,
      patient_auth_uid: uid,
      identity_linked_at: FieldValue.serverTimestamp(),
    });

    await db.collection('claim_assignment_audit').add({
      uid,
      patient_document_id: patientDocument.id,
      action: 'patient_claim_assigned',
      account_type: 'patient',
      national_id_last_four: nationalId.slice(-4),
      assigned_at: FieldValue.serverTimestamp(),
    });

    return { success: true, refreshTokenRequired: true };
  }
);

exports.reconcileLatePatientRecord = onDocumentWritten(
  {
    document: 'patients/{patientId}',
    region: 'us-central1',
  },
  async (event) => {
    if (!event.data?.after.exists) return;
    const data = event.data.after.data();
    if (data.patient_auth_uid) return;
    const canonicalId = normalizeNationalId(data.national_id);
    const legacyId = normalizeNationalId(data.nationalId);
    if (canonicalId && legacyId && canonicalId !== legacyId) return;
    await reconcilePatientLink(canonicalId || legacyId, 'patient_record_created');
  }
);

exports.reconcileNewPatientAccount = onDocumentWritten(
  {
    document: 'users/{userId}',
    region: 'us-central1',
  },
  async (event) => {
    if (!event.data?.after.exists) return;
    const data = event.data.after.data();
    if (String(data.role || data.account_type || '').toLowerCase() !== 'patient') return;
    const canonicalId = normalizeNationalId(data.national_id);
    const legacyId = normalizeNationalId(data.nationalId);
    if (canonicalId && legacyId && canonicalId !== legacyId) return;
    await reconcilePatientLink(canonicalId || legacyId, 'patient_account_created');
  }
);

exports.finalizeStaffOnboarding = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Firebase Authentication is required.');
    }

    const requestedRole = normalizeStaffRole(request.data?.requestedRole);
    if (!requestedRole) {
      throw new HttpsError('invalid-argument', 'A recognized staff role is required.');
    }

    const user = await auth.getUser(request.auth.uid);
    const email = normalizeEmail(user.email);
    if (!email) {
      throw new HttpsError('failed-precondition', 'The authenticated account has no email address.');
    }

    const existingClaims = user.customClaims || {};
    if (existingClaims.account_type === 'patient' || existingClaims.national_id) {
      throw new HttpsError('failed-precondition', 'A patient account cannot be converted into staff.');
    }

    // Existing matching claims make this callable safe to retry after token refresh failures.
    const expectedAccountType = requestedRole === 'doctor' ? 'doctor' : 'staff';
    if (
      existingClaims.account_type === expectedAccountType
      && existingClaims.staff_role === requestedRole
    ) {
      return { success: true, refreshTokenRequired: true, alreadyAssigned: true };
    }

    const approvalRef = db.doc(`staff_onboarding_approvals/${staffApprovalDocumentId(email)}`);
    const approvalSnapshot = await approvalRef.get();
    const runningInEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

    if (!approvalSnapshot.exists && !runningInEmulator) {
      throw new HttpsError('permission-denied', 'This staff account has not been approved.');
    }

    // Plan B convenience: isolated emulator users may self-select a role.
    // This branch can never run in deployed Cloud Functions.
    const approval = approvalSnapshot.exists
      ? approvalSnapshot.data()
      : {
          email,
          staff_role: requestedRole,
          status: 'approved',
          local_emulator_auto_approval: true,
        };
    if (
      normalizeEmail(approval.email) !== email
      || normalizeStaffRole(approval.staff_role) !== requestedRole
      || approval.status !== 'approved'
    ) {
      throw new HttpsError('permission-denied', 'The staff approval does not match this account and role.');
    }

    if (approval.uid && approval.uid !== user.uid) {
      throw new HttpsError('permission-denied', 'The staff approval is linked to another account.');
    }

    await auth.setCustomUserClaims(user.uid, {
      ...(user.customClaims || {}),
      account_type: expectedAccountType,
      staff_role: requestedRole,
    });

    await approvalRef.set({
      email,
      staff_role: requestedRole,
      status: 'approved',
      uid: user.uid,
      claimed_at: FieldValue.serverTimestamp(),
      ...(runningInEmulator ? { local_emulator_auto_approval: true } : {}),
    }, { merge: true });

    await db.collection('claim_assignment_audit').add({
      uid: user.uid,
      email,
      action: 'staff_claims_assigned',
      account_type: expectedAccountType,
      staff_role: requestedRole,
      assigned_at: FieldValue.serverTimestamp(),
    });

    return { success: true, refreshTokenRequired: true, alreadyAssigned: false };
  }
);
