import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

let rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!rawJson && process.env.FIREBASE_PRIVATE_KEY) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
    })
  });
} else {
  console.log("No config");
  process.exit(1);
}

const auth = getAuth();
auth.getUserByEmail('ernst@hatake.eu')
  .then(user => {
    console.log("Found user:", user.uid, user.email, user.displayName);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
