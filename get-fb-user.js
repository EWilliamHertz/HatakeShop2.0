import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
  })
});

const auth = getAuth();
auth.getUserByEmail('ernst@hatake.eu').then(u => {
  console.log("Firebase UID:", u.uid);
}).catch(e => {
  console.error("Firebase Auth Error:", e.message);
});
