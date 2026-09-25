import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  try {
    let credentialConfig;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      credentialConfig = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
    } else {
      credentialConfig = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY_BASE64
          ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('ascii')
          : (process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '') : undefined),
      });
    }

    initializeApp({
      credential: credentialConfig,
    });
    console.log("Firebase Admin Initialized Successfully");
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
