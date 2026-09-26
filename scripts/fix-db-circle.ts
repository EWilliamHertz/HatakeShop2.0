import 'dotenv/config';
import { db } from './src/db/index.js';
import { users, products } from './src/db/schema.js';
import { eq, or } from 'drizzle-orm';

async function run() {
  // Set Ernst (92) as the true owner. His teamOwnerId should be null (or point to himself, but usually null is better if he's the owner).
  await db.update(users).set({ teamOwnerId: null }).where(eq(users.id, 92));
  
  // Make sure Stefan and Zudran point to Ernst (92)
  await db.update(users).set({ teamOwnerId: 92 }).where(or(eq(users.id, 2), eq(users.id, 122)));

  // Update all products that belonged to Stefan (2) to belong to the company owner Ernst (92)
  await db.update(products).set({ sellerId: 92 }).where(eq(products.sellerId, 2));

  console.log("Database circle fixed. Ernst is now the primary company owner. All products transferred to company ID 92.");
  process.exit(0);
}
run();
