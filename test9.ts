import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const s = await db.select().from(users).where(eq(users.id, 1));
  console.log(s);
  process.exit(0);
}
main();
