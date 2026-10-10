import 'dotenv/config';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';
import { inArray } from 'drizzle-orm';

async function main() {
  await db.update(products).set({ isSverigeB2c: true }).where(inArray(products.title, ['Top-loaders 130pt', 'Deckboxes', '480-slots Binders', 'Playmats']));
  console.log("Updated products to be Sverige B2C");
  process.exit(0);
}
main();
