import { db } from "./src/db/index.js";
import { users, products, categories } from "./src/db/schema.js";
import { eq, or, ilike } from "drizzle-orm";

async function run() {
  const matchingUsers = await db.select().from(users).where(
    or(
      ilike(users.companyName, '%Fox%'),
      ilike(users.companyName, '%HatakeKB%')
    )
  );
  console.log("Found users:", matchingUsers.map(u => ({ id: u.id, name: u.companyName })));

  for (const u of matchingUsers) {
    const prods = await db.select().from(products).where(eq(products.sellerId, u.id)).limit(3);
    console.log(`\nProducts for ${u.companyName}:`);
    prods.forEach(p => console.log(`- ${p.title} | category: ${p.category} | originType: ${p.originType}`));
  }
  process.exit(0);
}
run();
