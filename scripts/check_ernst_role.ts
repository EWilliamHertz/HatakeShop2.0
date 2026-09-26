import 'dotenv/config';
import { db } from "./src/db/index.ts";
import { users } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  const ernst = await db.select().from(users).where(eq(users.email, 'ernst@hatake.eu')).limit(1);
  console.log(ernst[0]);
  process.exit(0);
}
main();
