import 'dotenv/config';
import { db } from './src/db/index.js';
import { products, users } from './src/db/schema.js';
import { eq, ilike, and, or } from 'drizzle-orm';

async function updateMoq() {
  const phoebe = await db.query.users.findFirst({ where: ilike(users.email, "%phoebe@topbestpkg.com%") });
  if (!phoebe) {
     console.error("Could not find Phoebe");
     return;
  }
  
  // 1. Top-loaders -> MOQ 500
  // Identify by title containing toploader or category 9
  const toploaderRes = await db.update(products).set({ moq: 500 })
    .where(and(
      eq(products.sellerId, phoebe.id),
      or(ilike(products.title, "%toploader%"), ilike(products.title, "%top-loader%"), ilike(products.title, "%top loader%"), eq(products.categoryId, 9))
    ))
    .returning({ id: products.id, title: products.title });
  console.log(`Updated ${toploaderRes.length} toploaders to MOQ 500.`);

  // 2. Sleeves -> MOQ 500
  const sleevesRes = await db.update(products).set({ moq: 500 })
    .where(and(
      eq(products.sellerId, phoebe.id),
      or(ilike(products.title, "%sleeve%"), eq(products.categoryId, 27), eq(products.categoryId, 28))
    ))
    .returning({ id: products.id, title: products.title });
  console.log(`Updated ${sleevesRes.length} sleeves to MOQ 500.`);
  
  // 3. Binders -> MOQ 100
  const bindersRes = await db.update(products).set({ moq: 100 })
    .where(and(
      eq(products.sellerId, phoebe.id),
      ilike(products.title, "%binder%")
    ))
    .returning({ id: products.id, title: products.title });
  console.log(`Updated ${bindersRes.length} binders to MOQ 100.`);

  process.exit(0);
}

updateMoq().catch(console.error);
