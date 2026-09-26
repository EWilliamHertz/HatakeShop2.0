import 'dotenv/config';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';

async function test() {
  const p1 = await db.select({ id: products.id }).from(products).limit(2).offset(0);
  const p2 = await db.select({ id: products.id }).from(products).limit(2).offset(2);
  console.log('Page 1:', p1);
  console.log('Page 2:', p2);
  process.exit(0);
}
test();
