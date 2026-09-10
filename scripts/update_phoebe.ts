import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(users).set({
    email: 'Phoebe@topbestpkg.com',
    displayName: 'Phoebe Hatake',
    companyName: 'Topbestpkg'
  }).where(eq(users.uid, 'mock-admin-uid'));
  console.log("Updated Phoebe!");
  process.exit(0);
}
run();
