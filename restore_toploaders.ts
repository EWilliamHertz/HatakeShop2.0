import 'dotenv/config';
import { db } from './src/db/index.js';
import { products, categories } from './src/db/schema.js';
import { ilike, eq } from 'drizzle-orm';

async function update() {
  console.log("Setting all 'toploader' products to Category 9...");
  await db.update(products).set({ categoryId: 9 })
    .where(ilike(products.title, "%toploader%"));
    
  await db.update(products).set({ categoryId: 9 })
    .where(ilike(products.title, "%top-loader%"));
    
  await db.update(products).set({ categoryId: 9 })
    .where(ilike(products.title, "%top loader%"));

  console.log("Done.");
  process.exit(0);
}

update().catch(console.error);
