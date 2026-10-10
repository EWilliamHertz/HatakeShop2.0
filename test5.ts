import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq, or, ilike } from 'drizzle-orm';

async function main() {
  const allUsers = await db.select().from(users).where(ilike(users.email, '%ernst%'));
  console.log(allUsers.map(u => ({ id: u.id, uid: u.uid, email: u.email, role: u.role, displayName: u.displayName })));
  process.exit(0);
}
main();
