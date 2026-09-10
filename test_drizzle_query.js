import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const result = await db.insert(users)
    .values({
      uid: 'fake-uid-123',
      email: 'Phoebe@topbestpkg.com',
      displayName: 'Phoebe',
      role: 'buyer',
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: 'Phoebe@topbestpkg.com',
        displayName: 'Phoebe',
        role: undefined,
      },
    })
    .toSQL();
  console.log(result);
}
run();
