import 'dotenv/config';
import { db } from '../src/db/index.js';
import { products } from '../src/db/schema.js';
import { generateEmbedding } from '../src/lib/services.js';
import { isNull, eq } from 'drizzle-orm';

async function main() {
  console.log('[Backfill] Checking for products missing embeddings...');
  const missing = await db.select({
    id: products.id,
    title: products.title,
    description: products.description,
    brand: products.brand,
    originType: products.originType,
  }).from(products).where(isNull(products.embedding));

  console.log(`[Backfill] Found ${missing.length} products needing embeddings.`);
  if (missing.length === 0) {
    console.log('[Backfill] All products already have embeddings.');
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    const textToEmbed = [p.title, p.brand, p.description, p.originType].filter(Boolean).join(' ');
    try {
      const embedding = await generateEmbedding(textToEmbed);
      if (embedding && Array.isArray(embedding)) {
        await db.update(products).set({ embedding }).where(eq(products.id, p.id));
        successCount++;
        console.log(`[${i + 1}/${missing.length}] Embedded product #${p.id} (${p.title?.slice(0, 30)})`);
      } else {
        failCount++;
        console.warn(`[${i + 1}/${missing.length}] Failed to generate embedding for #${p.id}`);
      }
    } catch (err: any) {
      failCount++;
      console.error(`[Backfill] Error on product #${p.id}:`, err?.message || err);
    }
    // Rate-limit pause between items
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[Backfill] Completed: ${successCount} updated, ${failCount} failed.`);
  process.exit(0);
}

main().catch(err => {
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
