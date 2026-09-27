import 'dotenv/config';
import { db } from '../src/db/index.js';
import { users, companies, companyMembers, products } from '../src/db/schema.js';
import { eq, isNotNull } from 'drizzle-orm';
import { createPool } from '../src/db/index.js';

async function run() {
  const pool = createPool();
  console.log('Running Manual DDL...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "companies" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "slug" text NOT NULL,
      "logo_url" text,
      "banner_url" text,
      "vat_number" text,
      "region" text,
      "country" text,
      "website" text,
      "about_us" text,
      "created_at" timestamp DEFAULT now(),
      CONSTRAINT "companies_slug_unique" UNIQUE("slug")
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "company_members" (
      "id" serial PRIMARY KEY NOT NULL,
      "company_id" integer NOT NULL,
      "user_id" integer NOT NULL,
      "role" text DEFAULT 'member',
      "created_at" timestamp DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_company_id" integer;
  `);

  await pool.query(`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "company_id" integer;
  `);

  console.log('Fetching users with company names...');
  const allUsers = await db.select().from(users).where(isNotNull(users.companyName));

  const uniqueCompanies = new Map<string, typeof users.$inferSelect>();

  for (const u of allUsers) {
    if (u.companyName && !uniqueCompanies.has(u.companyName.toLowerCase())) {
      uniqueCompanies.set(u.companyName.toLowerCase(), u);
    }
  }

  console.log(`Found ${uniqueCompanies.size} unique companies to create.`);

  const companyMap = new Map<string, number>();

  for (const [lowerName, u] of uniqueCompanies.entries()) {
    const slug = lowerName.replace(/[^a-z0-9]/g, '-');
    const [inserted] = await db.insert(companies).values({
      name: u.companyName!,
      slug,
      logoUrl: u.profilePictureUrl,
      bannerUrl: u.bannerUrl || u.storeBannerUrl,
      vatNumber: u.vatNumber,
      region: u.region,
      country: u.country,
      website: u.website,
      aboutUs: u.aboutUs,
    }).onConflictDoNothing().returning({ id: companies.id });
    
    if (inserted) {
      companyMap.set(lowerName, inserted.id);
      console.log(`Created company: ${u.companyName} with ID ${inserted.id}`);
    } else {
      // Fetch it if conflict occurred
      const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug));
      if (existing) {
        companyMap.set(lowerName, existing.id);
        console.log(`Found existing company: ${u.companyName} with ID ${existing.id}`);
      }
    }
  }

  console.log('Creating company members and updating products...');
  for (const u of allUsers) {
    if (u.companyName) {
      const companyId = companyMap.get(u.companyName.toLowerCase());
      if (companyId) {
        // Create member (skip if exists? let's ignore errors or check first)
        const [existingMember] = await db.select().from(companyMembers).where(eq(companyMembers.userId, u.id));
        if (!existingMember) {
           await db.insert(companyMembers).values({
            companyId,
            userId: u.id,
            role: u.teamRole === 'owner' ? 'owner' : 'member',
          });
        }
        
        // Update user's active company
        await db.update(users)
          .set({ activeCompanyId: companyId })
          .where(eq(users.id, u.id));

        // Update user's products
        await db.update(products)
          .set({ companyId })
          .where(eq(products.sellerId, u.id));
      }
    }
  }
  
  console.log('Migration completed successfully.');
  process.exit(0);
}

run().catch(console.error);
