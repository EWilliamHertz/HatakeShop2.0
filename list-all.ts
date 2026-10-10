import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function main() {
  const allUsers = await db.select().from(users);
  console.log(allUsers.map(u => ({ id: u.id, email: u.email, role: u.role, displayName: u.displayName, uid: u.uid })));
  process.exit(0);
}
main();
