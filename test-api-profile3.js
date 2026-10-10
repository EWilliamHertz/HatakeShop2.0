import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { adminAuth } from './src/lib/firebase-admin.js';

async function main() {
  console.log("adminAuth exists?", !!adminAuth.verifyIdToken);
}
main();
