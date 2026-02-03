import "server-only";

import { App, applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | null = null;

function hasFirebaseCertEnv() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function initWithCert() {
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  // Bucket opcional: si no está, Storage usa el bucket default del proyecto.
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

function initWithADC() {
  // Usa GOOGLE_APPLICATION_CREDENTIALS (tu JSON) en local,
  // y también funciona en entornos GCP con Service Account attachado.
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  return initializeApp({
    credential: applicationDefault(),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

export function getAdminApp() {
  if (adminApp) return adminApp;

  if (!getApps().length) {
    adminApp = hasFirebaseCertEnv() ? initWithCert() : initWithADC();
  } else {
    adminApp = getApps()[0]!;
  }

  return adminApp;
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export function adminBucket() {
  // usa el storageBucket configurado en initializeApp (si se configuró),
  // si no, intenta usar el default del proyecto.
  return getStorage(getAdminApp()).bucket();
}