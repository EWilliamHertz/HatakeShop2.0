import "dotenv/config";
import { db } from './src/db/index.js';
import { categories, products, users } from './src/db/schema.js';
import { eq, ilike, or } from 'drizzle-orm';

async function run() {
  console.log("--- Categories ---");
  const allCats = await db.query.categories.findMany();
  for (const cat of allCats) {
    console.log(`ID: ${cat.id} | Name: ${cat.name} | ParentID: ${cat.parentId}`);
  }
  
  console.log("\n--- TopBestPKG Toploaders ---");
  const phoebe = await db.query.users.findFirst({ where: ilike(users.email, "phoebe@topbestpkg.com") });
  if (phoebe) {
     const toploaders = await db.query.products.findMany({
        where: (products, { and, ilike, or }) => and(
           eq(products.sellerId, phoebe.id),
           or(ilike(products.title, "%toploader%"), ilike(products.title, "%top loader%"), ilike(products.title, "%top-loader%"))
        )
     });
     console.log(`Found ${toploaders.length} toploaders for TopBestPKG`);
     toploaders.forEach(p => console.log(` - ID: ${p.id} | Title: ${p.title} | CatID: ${p.categoryId}`));
  }
  
  process.exit(0);
}
run().catch(console.error);
