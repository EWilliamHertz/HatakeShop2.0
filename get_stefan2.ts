import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const all = await db.select().from(users).where(eq(users.email, 'stefan@hatake.eu'));
  all.forEach(u => {
    console.log(`ID: ${u.id}, Email: ${u.email}, UID: ${u.uid}, Company: ${u.companyName}`);
  });
}
main().catch(console.error);
