'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'medical-record-system-97a1f';
const LOCAL_STAFF = [
  { email: 'doctor@gmail.com', password: 'doctordoctor', role: 'doctor', name: 'Local Doctor' },
  { email: 'hospital@gmail.com', password: 'hospitalhospital', role: 'hospital', name: 'Local Hospital' },
  { email: 'lab@gmail.com', password: 'lablab', role: 'laboratory', name: 'Local Laboratory' },
  { email: 'pharmacy@gmail.com', password: 'pharmacypharmacy', role: 'pharmacy', name: 'Local Pharmacy' },
];

function requireLocalEmulators() {
  const hosts = [
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
    process.env.FIRESTORE_EMULATOR_HOST,
  ];
  if (hosts.some((host) => !host)) {
    throw new Error('Refusing to seed: Auth and Firestore emulator hosts are required.');
  }
  if (hosts.some((host) => !/^(127\.0\.0\.1|localhost):\d+$/.test(host))) {
    throw new Error('Refusing to seed non-local emulator hosts.');
  }
}

async function upsertStaff(auth, db, staff) {
  let user;
  try {
    user = await auth.getUserByEmail(staff.email);
    user = await auth.updateUser(user.uid, {
      password: staff.password,
      emailVerified: true,
      displayName: staff.name,
    });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({
      email: staff.email,
      password: staff.password,
      emailVerified: true,
      displayName: staff.name,
    });
  }

  const accountType = staff.role === 'doctor' ? 'doctor' : 'staff';
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    account_type: accountType,
    staff_role: staff.role,
  });

  await db.doc(`staff_onboarding_approvals/${encodeURIComponent(staff.email)}`).set({
    email: staff.email,
    staff_role: staff.role,
    status: 'approved',
    uid: user.uid,
    local_emulator_seed: true,
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true });

  const websiteRole = staff.role === 'laboratory'
    ? 'Laboratory'
    : staff.role[0].toUpperCase() + staff.role.slice(1);
  await db.doc(`website_users/${staff.name}`).set({
    uid: user.uid,
    fullName: staff.name,
    email: staff.email,
    role: websiteRole,
    authProvider: 'password',
    local_emulator_seed: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(
    `LOCAL_STAFF role=${staff.role} email=${staff.email} password=${staff.password} uid=${user.uid}`
  );
}

async function main() {
  requireLocalEmulators();
  const app = getApps()[0] || initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth(app);
  const db = getFirestore(app);

  for (const staff of LOCAL_STAFF) await upsertStaff(auth, db, staff);

  const patientRef = db.doc('patients/local-patient-02010898989');
  await patientRef.set({
    name: 'Local Test Patient',
    national_id: '02010898989',
    nationalId: '02010898989',
    yearOfBirth: 1995,
    gender: 'Female',
    bloodType: 'O+',
    local_emulator_seed: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await patientRef.collection('prescriptions').doc('local-prescription').set({
    date: '2026-07-17',
    doctor: 'Local Test Doctor',
    items: [{ name: 'Local Medication', dosage: '10 mg', frequency: 'Once daily' }],
    local_emulator_seed: true,
  }, { merge: true });

  console.log('LOCAL_EMULATOR_SEED_OK staff=4 patientNationalId=02010898989');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
