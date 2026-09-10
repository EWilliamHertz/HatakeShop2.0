import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  await db.update(users).set({ 
    storeSlug: 'aqua-treasures',
    storeBannerUrl: 'https://images.unsplash.com/photo-1621644062402-99071060934d?auto=format&fit=crop&q=80&w=2000',
    storePolicies: '1. All orders shipped within 48 hours.\n2. We accept returns within 14 days for sealed products only.\n3. Wholesale pricing applies to orders over $500.'
  }).where(eq(users.email, 'stefan@hatake.eu'));

  await db.update(users).set({ 
    storeSlug: 'topbestpkg',
    storePolicies: '100% Quality Guaranteed.'
  }).where(eq(users.email, 'Phoebe@topbestpkg.com'));
  
  console.log("Seeded storefronts");
  process.exit(0);
}
run();
