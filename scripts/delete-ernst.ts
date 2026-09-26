import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  await db.delete(users).where(eq(users.id, 127));
  console.log("Deleted duplicate Ernst (ID 127).");
  process.exit(0);
}
run();
