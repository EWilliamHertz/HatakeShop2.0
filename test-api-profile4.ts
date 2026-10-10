import 'dotenv/config';
import { adminAuth } from './src/lib/firebase-admin.js';

async function main() {
  console.log("adminAuth exists?", !!adminAuth.verifyIdToken);
}
main();
