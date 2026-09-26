import 'dotenv/config';
import { db } from './src/db/index.js';
import { products, users } from './src/db/schema.js';
import { eq, ilike, or, inArray } from 'drizzle-orm';

async function updateCategories() {
  console.log("Looking for Phoebe...");
  const phoebe = await db.query.users.findFirst({ where: ilike(users.email, "%phoebe@topbestpkg.com%") });
  
  if (phoebe) {
     console.log("Updating toploaders for Phoebe...");
     const updated = await db.update(products).set({ categoryId: 9 })
       .where(or(
         ilike(products.title, "%toploader%"),
         ilike(products.title, "%top-loader%"),
         ilike(products.title, "%top loader%")
       ))
       .returning({ id: products.id, title: products.title });
     
     console.log(`Updated ${updated.length} toploaders to Category 9 (Top-Loaders)`);
  }

  console.log("Moving all merchandise from child categories to parent 'Merchandise' (ID 24)");
  // Child categories of Merchandise (24) are 5, 6, 9, 10, 11, 25, 26
  const merchandiseChildCats = [5, 6, 9, 10, 11, 25, 26];
  
  const updatedMerch = await db.update(products)
    .set({ categoryId: 24 })
    .where(inArray(products.categoryId, merchandiseChildCats))
    .returning({ id: products.id, title: products.title, categoryId: products.categoryId });
    
  console.log(`Moved ${updatedMerch.length} products to Merchandise (ID 24)`);

  process.exit(0);
}

updateCategories().catch(console.error);
