import 'dotenv/config';
import { db } from '../src/db/index.js';
import { users, companies, companyMembers } from '../src/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function run() {
  const ernst = await db.select().from(users).where(eq(users.email, 'ernst@hatake.eu')).limit(1);
  const stefan = await db.select().from(users).where(eq(users.email, 'Stefanborglin@gmail.com')).limit(1);

  if (!ernst[0]) {
    console.log("Could not find ernst@hatake.eu");
  }
  
  if (!stefan[0]) {
    console.log("Could not find Stefanborglin@gmail.com");
  }

  // Helper to get or create company
  async function getOrCreateCompany(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    if (!company) {
      console.log(`Creating company ${name}...`);
      const [inserted] = await db.insert(companies).values({ name, slug }).returning();
      company = inserted;
    }
    return company;
  }

  // Helper to add member
  async function addMember(companyId: number, userId: number) {
    const [existing] = await db.select().from(companyMembers).where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)));
    if (!existing) {
      console.log(`Adding user ${userId} to company ${companyId}...`);
      await db.insert(companyMembers).values({ companyId, userId, role: 'member' });
    } else {
      console.log(`User ${userId} already in company ${companyId}`);
    }
  }

  if (ernst[0]) {
    const foxDrop = await getOrCreateCompany('FoxDropStore');
    await addMember(foxDrop.id, ernst[0].id);

    const topBest = await getOrCreateCompany('TopBestPKG');
    await addMember(topBest.id, ernst[0].id);
    
    const glimmerFall = await getOrCreateCompany('GlimmerFall');
    await addMember(glimmerFall.id, ernst[0].id);
  }

  if (stefan[0]) {
    const glimmerFall = await getOrCreateCompany('GlimmerFall');
    await addMember(glimmerFall.id, stefan[0].id);
  }

  console.log("Done.");
  process.exit(0);
}

run().catch(console.error);
