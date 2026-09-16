import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq, like, or } from 'drizzle-orm';

async function main() {
  const allHatake = await db.select().from(users).where(like(users.email, '%hatake%'));
  console.log("Hatake Emails:", allHatake);
  
  const allCompany = await db.select().from(users).where(like(users.companyName, '%Hatake%'));
  console.log("Hatake Companies:", allCompany);
  
  process.exit(0);
}

main().catch(console.error);
