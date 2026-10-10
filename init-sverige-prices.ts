import 'dotenv/config';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const pList = await db.select().from(products);
    for (const p of pList) {
      if (p.title.includes('Top-loaders 130pt') || p.title.includes('130pt')) {
        await db.update(products).set({ sverigePrice: '30' }).where(eq(products.id, p.id));
      }
      if (p.title.includes('Deckboxes') || p.title.includes('Deck Box')) {
        await db.update(products).set({ sverigePrice: '300' }).where(eq(products.id, p.id));
      }
      if (p.title.includes('480-slots Binders') || p.title.includes('Binder')) {
        await db.update(products).set({ sverigePrice: '360' }).where(eq(products.id, p.id));
      }
      if (p.title.includes('Playmats') || p.title.includes('Playmat')) {
        await db.update(products).set({ sverigePrice: '129' }).where(eq(products.id, p.id));
      }
    }
    console.log("Updated initial sverige prices successfully!");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
main();
