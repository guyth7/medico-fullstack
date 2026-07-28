'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const ALLOWED_ROLES = new Set(['doctor', 'hospital', 'laboratory', 'pharmacy']);

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function loadServiceAccount(projectId) {
  const configuredPath = argumentValue('--service-account')
    || process.env.GOOGLE_APPLICATION_CREDENTIALS
    || path.join('config', 'service-account.json');
  const credentialPath = path.resolve(process.cwd(), configuredPath);

  if (!fs.existsSync(credentialPath)) {
    throw new Error(
      `Service account file not found: ${credentialPath}\n`
      + 'Provide --service-account <path>, set GOOGLE_APPLICATION_CREDENTIALS, '
      + 'or create functions/config/service-account.json.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse service account JSON at ${credentialPath}: ${error.message}`);
  }

  for (const field of ['project_id', 'client_email', 'private_key']) {
    if (!serviceAccount[field] || typeof serviceAccount[field] !== 'string') {
      throw new Error(`Service account JSON is missing required string field "${field}".`);
    }
  }

  if (serviceAccount.project_id !== projectId) {
    throw new Error(
      `Service account project "${serviceAccount.project_id}" does not match --project "${projectId}".`
    );
  }

  return { credentialPath, serviceAccount };
}

function normalizeEntry(raw, index) {
  const uid = String(raw.uid || '').trim();
  const email = String(raw.email || '').trim().toLowerCase();
  const staffRole = String(raw.staff_role || raw.role || '').trim().toLowerCase();

  if ((!uid && !email) || (uid && email)) {
    throw new Error(`Entry ${index + 1} must contain exactly one of "uid" or "email".`);
  }
  if (!ALLOWED_ROLES.has(staffRole)) {
    throw new Error(`Entry ${index + 1} has unsupported staff role "${staffRole}".`);
  }

  return { uid, email, staffRole };
}

async function main() {
  const allowlistArgument = argumentValue('--allowlist');
  const projectId = String(argumentValue('--project') || '').trim();
  const apply = process.argv.includes('--apply');
  const validateOnly = process.argv.includes('--validate-only');

  if (apply && validateOnly) {
    throw new Error('--apply and --validate-only cannot be used together.');
  }

  if (!allowlistArgument) {
    throw new Error('Pass a reviewed allowlist with --allowlist <path>.');
  }
  if (!projectId) {
    throw new Error('Pass the intended Firebase project with --project <project-id>.');
  }

  const allowlistPath = path.resolve(process.cwd(), allowlistArgument);
  const parsed = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('The allowlist must be a non-empty JSON array.');
  }

  const entries = parsed.map(normalizeEntry);
  const identities = new Set();
  for (const entry of entries) {
    const identity = entry.uid ? `uid:${entry.uid}` : `email:${entry.email}`;
    if (identities.has(identity)) throw new Error(`Duplicate allowlist identity: ${identity}`);
    identities.add(identity);
  }

  if (validateOnly) {
    console.log(`VALIDATION ONLY project=${projectId}`);
    for (const entry of entries) {
      const identity = entry.uid ? `uid=${entry.uid}` : `email=${entry.email}`;
      const accountType = entry.staffRole === 'doctor' ? 'doctor' : 'staff';
      console.log(
        `SIMULATED ${identity} => account_type=${accountType}, staff_role=${entry.staffRole}`
      );
    }
    console.log(
      `VALIDATION PASSED: ${entries.length} allowlisted account configuration(s) parsed; `
      + 'no credentials loaded and no Firebase requests made.'
    );
    return;
  }

  const { credentialPath, serviceAccount } = loadServiceAccount(projectId);
  console.log(`Using service account credentials from ${credentialPath}`);

  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const planned = [];

  for (const entry of entries) {
    const user = entry.uid
      ? await auth.getUser(entry.uid)
      : await auth.getUserByEmail(entry.email);
    const existingClaims = user.customClaims || {};

    if (existingClaims.account_type === 'patient' || existingClaims.national_id) {
      throw new Error(`Refusing to convert patient account ${user.uid} into staff.`);
    }

    const claims = {
      ...existingClaims,
      account_type: entry.staffRole === 'doctor' ? 'doctor' : 'staff',
      staff_role: entry.staffRole,
    };

    planned.push({ user, claims });
    console.log(
      `${apply ? 'APPLY' : 'DRY RUN'} ${user.uid} ${user.email || '(no email)'} `
      + `=> account_type=${claims.account_type}, staff_role=${claims.staff_role}`
    );
  }

  if (!apply) {
    console.log(`Dry run complete for ${planned.length} account(s). Re-run with --apply after review.`);
    return;
  }

  for (const { user, claims } of planned) {
    await auth.setCustomUserClaims(user.uid, claims);
    await db.collection('claim_assignment_audit').add({
      uid: user.uid,
      email: user.email || null,
      action: 'staff_claims_seeded',
      account_type: claims.account_type,
      staff_role: claims.staff_role,
      assigned_at: FieldValue.serverTimestamp(),
      migration: 'phase-1-staff-claims',
    });
    console.log(`UPDATED ${user.uid}`);
  }

  console.log(`Applied staff claims to ${planned.length} account(s). Users must refresh tokens or sign in again.`);
}

main().catch((error) => fail(error.stack || error.message));
