import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function run() {
  const allUsers = await db.select({ id: users.id, email: users.email, role: users.role, verificationStatus: users.verificationStatus }).from(users);
  console.log(allUsers.filter(u => u.email.includes('hatake.eu')));
  process.exit(0);
}
run();
