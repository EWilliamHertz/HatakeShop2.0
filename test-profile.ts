import 'dotenv/config';
import { adminAuth } from './src/lib/firebase-admin.js';
import { getUserProfile } from './src/db/users.js';

async function main() {
  try {
    const user = await getUserProfile('uJjvZKedn0MBrz75w6bd9Az8P0H3');
    console.log("DB User:", user.displayName, user.role);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
