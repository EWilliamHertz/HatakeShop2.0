import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { ilike } from 'drizzle-orm';

async function run() {
  const ernstUsers = await db.select().from(users).where(ilike(users.email, '%ernst%'));
  console.log("Ernst users:", ernstUsers.map(u => ({ id: u.id, email: u.email, role: u.role, teamRole: u.teamRole })));
  process.exit(0);
}
run();
