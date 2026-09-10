import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq, or } from 'drizzle-orm';

async function run() {
  // Show all users first
  const all = await db.select({ id: users.id, uid: users.uid, email: users.email, role: users.role, teamOwnerId: users.teamOwnerId }).from(users);
  console.log("ALL USERS BEFORE:", JSON.stringify(all, null, 2));
  
  // 1. Delete the OLD ernst (mock uid 'ernst-uid', id 3) — keep the real Firebase one (uid uJjvZKed...)
  const delErnst = await db.delete(users).where(eq(users.uid, 'ernst-uid')).returning({ id: users.id, email: users.email });
  console.log("DELETED old Ernst:", delErnst);

  // 2. Delete the capital-P Phoebe (id 14, uid 'mock-admin-uid')
  const delPhoebe = await db.delete(users).where(eq(users.uid, 'mock-admin-uid')).returning({ id: users.id, email: users.email });
  console.log("DELETED capital-P Phoebe:", delPhoebe);

  // 3. Set password for lowercase phoebe@topbestpkg.com to 'yourthebest'
  const updPhoebe = await db.update(users).set({ password: 'yourthebest' }).where(eq(users.email, 'phoebe@topbestpkg.com')).returning({ id: users.id, email: users.email });
  console.log("UPDATED phoebe password:", updPhoebe);

  // Show remaining users
  const remaining = await db.select({ id: users.id, uid: users.uid, email: users.email, role: users.role, teamOwnerId: users.teamOwnerId }).from(users);
  console.log("\nALL USERS AFTER:", JSON.stringify(remaining, null, 2));

  process.exit(0);
}
run();
