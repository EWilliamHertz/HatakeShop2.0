import "dotenv/config";
import { db } from './src/db/index.ts';
import { products } from './src/db/schema.ts';
import { like } from 'drizzle-orm';

async function run() {
  await db.delete(products).where(like(products.title, '%Magnetic Card Holders%'));
  console.log("Deleted");
  process.exit(0);
}
run();
