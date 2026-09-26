import { db } from './src/db/index.ts';
import { categories } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function seed() {
  const cats = [
    { name: 'Trading Card Game (TCG)', slug: 'tcg', parentId: null },
    { name: 'Electronics', slug: 'electronics', parentId: null }
  ];
  
  for (const c of cats) {
    const existing = await db.select().from(categories).where(eq(categories.slug, c.slug));
    let parentId = existing.length ? existing[0].id : null;
    
    if (!parentId) {
      const res = await db.insert(categories).values(c).returning();
      parentId = res[0].id;
    }
    
    let subcats = [];
    if (c.slug === 'tcg') {
      subcats = [
        { name: 'Pokemon', slug: 'tcg-pokemon', parentId },
        { name: 'Magic the Gathering', slug: 'tcg-mtg', parentId },
        { name: 'One Piece', slug: 'tcg-one-piece', parentId },
        { name: 'Merchandise', slug: 'tcg-merch', parentId }
      ];
    } else if (c.slug === 'electronics') {
      subcats = [
        { name: 'Phones', slug: 'electronics-phones', parentId },
        { name: 'Monitors', slug: 'electronics-monitors', parentId },
        { name: 'Charging Cables', slug: 'electronics-cables', parentId },
        { name: 'Headphones', slug: 'electronics-headphones', parentId }
      ];
    }
    
    for (const sub of subcats) {
      const exSub = await db.select().from(categories).where(eq(categories.slug, sub.slug));
      if (!exSub.length) {
        await db.insert(categories).values(sub);
      }
    }
  }
  console.log('Categories seeded.');
  process.exit(0);
}
seed();
