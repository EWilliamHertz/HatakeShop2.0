import 'dotenv/config';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';

async function run() {
  const allProducts = await db.select({ id: products.id, sellerId: products.sellerId, title: products.title }).from(products);
  console.log(allProducts.filter(p => p.sellerId === 127 || p.sellerId === 92 || p.sellerId === 2));
  process.exit(0);
}
run();
