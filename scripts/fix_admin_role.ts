import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(users).set({ role: 'admin' }).where(eq(users.email, 'ewilliamhe@gmail.com'));
  const allUsers = await db.select().from(users);
  console.log("All users:", allUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
  process.exit(0);
}
run();
