import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const user = await db.select().from(users).where(eq(users.email, 'ewilliamhe@gmail.com'));
  console.log("User:", user);
  process.exit(0);
}
run();
