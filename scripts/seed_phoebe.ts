import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';

async function run() {
  try {
    await db.insert(users).values({
      uid: 'mock-admin-uid',
      email: 'phoebe@topbestpkg.com',
      displayName: 'Phoebe (Admin)',
      role: 'admin',
      verificationStatus: 'verified'
    }).onConflictDoNothing();
    console.log("Phoebe seeded.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
