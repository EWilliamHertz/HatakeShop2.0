import 'dotenv/config';
import { db } from './src/db/index.js';
import { products, users } from './src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const allProducts = await db.select({
    product: products,
    seller: users
  }).from(products).leftJoin(users, eq(products.sellerId, users.id)).orderBy(desc(products.createdAt));
  console.log('Total products fetched:', allProducts.length);
  process.exit(0);
}
main();
