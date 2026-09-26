import { db } from "./src/db/index.js";
import { users, products, categories } from "./src/db/schema.js";
import { eq, or, ilike } from "drizzle-orm";

async function run() {
  const allCats = await db.select().from(categories);
  const catMap = new Map(allCats.map(c => [c.id, c.name]));

  const matchingUsers = await db.select().from(users).where(
    or(
      ilike(users.companyName, '%Fox%'),
      ilike(users.companyName, '%Hatake%')
    )
  );

  for (const u of matchingUsers) {
    const prods = await db.select().from(products).where(eq(products.sellerId, u.id));
    if (prods.length > 0) {
      console.log(`\nProducts for ${u.companyName} (${prods.length}):`);
      for (const p of prods.slice(0, 5)) {
        const cName = p.categoryId ? catMap.get(p.categoryId) : 'null';
        console.log(`- ${p.title} | categoryId: ${p.categoryId} (${cName}) | originType: ${p.originType}`);
      }
    }
  }
  process.exit(0);
}
run();
