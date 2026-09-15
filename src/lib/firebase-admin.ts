import admin from 'firebase-admin';

// Safely resolve the Firebase Admin instance (handles Vercel's ESM bundling quirk)
const firebaseAdmin = admin.apps ? admin : (admin as any).default || admin;

if (!firebaseAdmin.apps || firebaseAdmin.apps.length === 0) {
  try {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The replace regex ensures Vercel doesn't mangle the private key line breaks
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
    console.log("Firebase Admin Initialized Successfully");
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export const adminDb = firebaseAdmin.firestore();
export const adminAuth = firebaseAdmin.auth();
