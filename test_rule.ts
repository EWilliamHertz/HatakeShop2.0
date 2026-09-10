import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
export const adminAuth = getAuth();
export const adminDb = getFirestore(getApp(), firebaseConfig.firestoreDatabaseId || '(default)');

async function run() {
   const users = await adminAuth.listUsers(10);
   const user = users.users.find(u => u.email === "test@example.com") || users.users[0];
   console.log("User:", user.uid);
}
run();
