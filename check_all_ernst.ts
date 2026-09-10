import 'dotenv/config';
import { db } from "./src/db/index.ts";
import { users } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  const ernstRows = await db.select().from(users).where(eq(users.email, 'ernst@hatake.eu'));
  console.log(ernstRows.map(u => ({ id: u.id, uid: u.uid, role: u.role, created: u.createdAt })));
  process.exit(0);
}
main();
