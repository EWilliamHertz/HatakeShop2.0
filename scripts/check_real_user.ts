import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const existing = await db.select().from(users).where(eq(users.uid, 'fmzfhao4oZgkMWuQBISnGvIqEqY2'));
  console.log("User:", existing);
  process.exit(0);
}
run();
