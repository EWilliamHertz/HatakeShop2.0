import 'dotenv/config';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';

async function main() {
  const allProducts = await db.select().from(products).limit(2);
  console.log(allProducts.map(p => p.title));
  process.exit(0);
}
main();
