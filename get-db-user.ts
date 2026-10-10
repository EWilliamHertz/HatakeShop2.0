import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const u = await db.select().from(users).where(eq(users.email, 'ernst@hatake.eu'));
  console.log("DB UID:", u[0]?.uid, "Role:", u[0]?.role, "Name:", u[0]?.displayName);
  process.exit(0);
}
main();
