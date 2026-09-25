/**
 * Backfills product embeddings for AI sourcing / vector search.
 *
 * Usage:
 *   npx tsx scripts/backfill_embeddings.ts          # only rows with NULL embedding
 *   npx tsx scripts/backfill_embeddings.ts --all    # recompute every product
 *
 * Safe to re-run. Rows that fail keep embedding = NULL so a later run retries them.
 * Run nightly via Vercel Cron / GitHub Action so new products never stay dark:
 *   e.g. add "backfill-embeddings": "tsx scripts/backfill_embeddings.ts" to package.json
 */
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { products } from '../src/db/schema.js';
import { isNull, isNotNull } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { generateEmbedding } from '../src/lib/services.js';

const FORCE_ALL = process.argv.includes('--all');
const BATCH_PAUSE_MS = 150; // stay well under Gemini rate limits

async function main() {
  const rows = FORCE_ALL
    ? await db.select().from(products).where(isNotNull(products.id))
    : await db.select().from(products).where(isNull(products.embedding));

  console.log(`Found ${rows.length} product(s) to embed${FORCE_ALL ? ' (force all)' : ''}.`);

  let ok = 0;
  let failed = 0;

  for (const [i, p] of rows.entries()) {
    const text = [
      p.title,
      p.brand,
      p.description,
      p.sealedType,
      p.language,
      p.productType,
      p.gradingCompany,
      p.cardSet,
    ].filter(Boolean).join(' ');

    try {
      const emb = await generateEmbedding(text);
      if (emb && emb.length > 0) {
        await db.update(products).set({ embedding: emb }).where(eq(products.id, p.id));
        ok++;
      } else {
        // ensure it stays NULL so the next run retries
        await db.update(products).set({ embedding: null }).where(eq(products.id, p.id));
        failed++;
        console.warn(`[${i + 1}/${rows.length}] no embedding returned for #${p.id} "${p.title}"`);
      }
    } catch (e: any) {
      failed++;
      console.error(`[${i + 1}/${rows.length}] FAILED #${p.id} "${p.title}": ${e.message}`);
    }

    if ((i + 1) % 20 === 0) console.log(`  progress: ${i + 1}/${rows.length} (ok=${ok}, failed=${failed})`);
    await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
  }

  console.log(`Done. ok=${ok} failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
