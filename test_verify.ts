import { adminAuth } from './src/lib/firebase-admin.ts';

async function run() {
  try {
    // Just try verifying a fake token to see if it throws network error or just invalid token
    await adminAuth.verifyIdToken('fake_token_123');
    console.log("Verified");
  } catch(e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
}
run();
