import 'dotenv/config';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';

async function main() {
  const allProds = await db.select().from(products).limit(5);
  console.log(allProds.map(p => ({
    title: p.title,
    sellerId: p.sellerId
  })));
  process.exit(0);
}
main();
