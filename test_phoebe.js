import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
async function test() {
  const allUsers = await db.select().from(users);
  console.log(allUsers.filter(u => u.email && u.email.toLowerCase() === 'phoebe@topbestpkg.com'));
}
test().catch(console.error);
