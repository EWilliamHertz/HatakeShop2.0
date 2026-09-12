import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

if (!getApps().length) {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    // Explicit service account credentials -- required on Vercel, which has
    // no metadata server for Application Default Credentials to fall back on.
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // Vercel env vars store literal "\n" for newlines; convert back to real ones.
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: firebaseConfig.projectId,
    });
  } else {
    console.warn(
      '⚠️  FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY are not set. ' +
      'Falling back to Application Default Credentials, which will fail on Vercel ' +
      '("Could not load the default credentials"). Firestore-backed features ' +
      '(notifications, RFQ mirrors) will not work until these are set.'
    );
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore(getApp(), firebaseConfig.firestoreDatabaseId || '(default)');
