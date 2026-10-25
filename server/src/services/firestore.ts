import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not set. See server/.env.example.'
    );
  }
  return JSON.parse(raw);
}

if (!getApps().length) {
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST &&
      process.env.GCLOUD_PROJECT?.startsWith('demo-')) {
    // Explicit local-only test mode. Real projects still require credentials.
    initializeApp({ projectId: process.env.GCLOUD_PROJECT });
  } else {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
}

export const db = getFirestore();
export const auth = getAuth();
