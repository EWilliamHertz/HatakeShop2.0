import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  await db.update(users).set({ uid: 'uJjvZKedn0MBrz75w6bd9Az8P0H3' }).where(eq(users.email, 'ernst@hatake.eu'));
  console.log("Restored uid");
  process.exit(0);
}
main();
