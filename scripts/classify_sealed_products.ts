/**
 * Backfill `language` and `sealed_type` on existing products.
 *
 * SAFE / NON-DESTRUCTIVE:
 *   - Adds the two columns if they don't exist (IF NOT EXISTS).
 *   - Never deletes rows. Never touches rows that already have a value
 *     (unless --force is passed).
 *   - Prints a full report of what was classified and what it could NOT
 *     classify so you can fix the remainder in the Admin dashboard.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/classify_sealed_products.ts            # dry run (no writes)
 *   DATABASE_URL="postgresql://..." npx tsx scripts/classify_sealed_products.ts --apply    # write results
 *   DATABASE_URL="postgresql://..." npx tsx scripts/classify_sealed_products.ts --apply --force  # overwrite existing values too
 */
import 'dotenv/config';
import pg from 'pg';
import { classifyProduct, languageLabel, sealedTypeLabel } from '../src/lib/productTaxonomy.ts';

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  const needsSsl = /sslmode=require|neon\.tech|\.rds\.|supabase/.test(url);
  const client = new pg.Client({ connectionString: url, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
  await client.connect();

  // 1. Ensure columns exist (idempotent, additive only)
  await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS language text`);
  await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sealed_type text`);
  await client.query(`CREATE INDEX IF NOT EXISTS products_language_idx ON products (language)`);
  await client.query(`CREATE INDEX IF NOT EXISTS products_sealed_type_idx ON products (sealed_type)`);

  // 2. Load products
  const { rows } = await client.query(
    `SELECT id, title, description, brand, card_set, product_type, language, sealed_type
       FROM products
      ORDER BY id`
  );
  console.log(`Loaded ${rows.length} products (${APPLY ? 'APPLY' : 'DRY RUN'}${FORCE ? ', FORCE' : ''})\n`);

  const unresolved: any[] = [];
  const inferredEn: any[] = [];
  const stats = { updated: 0, skipped: 0, lang: {} as Record<string, number>, type: {} as Record<string, number> };

  for (const p of rows) {
    if (p.product_type === 'graded') { stats.skipped++; continue; } // cards are not part of this taxonomy

    const guess = classifyProduct({ title: p.title, description: p.description, brand: p.brand, cardSet: p.card_set });

    const newLang = FORCE ? guess.language : (p.language || guess.language);
    const newType = FORCE ? guess.sealedType : (p.sealed_type || guess.sealedType);

    const changed = newLang !== p.language || newType !== p.sealed_type;
    if (changed && APPLY) {
      await client.query(`UPDATE products SET language = $1, sealed_type = $2 WHERE id = $3`, [newLang, newType, p.id]);
    }
    if (changed) stats.updated++;

    if (newLang) stats.lang[newLang] = (stats.lang[newLang] || 0) + 1;
    if (newType) stats.type[newType] = (stats.type[newType] || 0) + 1;

    const flag = changed ? (APPLY ? '✔' : '~') : ' ';
    const inferredMark = (!p.language || FORCE) && guess.languageInferred && newLang === 'en' ? ' (inferred)' : '';
    console.log(`${flag} #${String(p.id).padStart(4)}  ${((languageLabel(newLang) || '—') + inferredMark).padEnd(34)} ${(sealedTypeLabel(newType) || '—').padEnd(38)} ${p.title}`);
    if (inferredMark) inferredEn.push({ id: p.id, title: p.title });

    if ((!newLang && newType !== 'accessory') || !newType) unresolved.push({ id: p.id, title: p.title, language: newLang, sealedType: newType });
  }

  console.log('\n===== SUMMARY =====');
  console.log(`${APPLY ? 'Updated' : 'Would update'}: ${stats.updated}   Skipped (graded): ${stats.skipped}`);
  console.log('By language:', Object.fromEntries(Object.entries(stats.lang).map(([k, v]) => [languageLabel(k), v])));
  console.log('By type    :', Object.fromEntries(Object.entries(stats.type).map(([k, v]) => [sealedTypeLabel(k), v])));

  if (inferredEn.length) {
    console.log(`\nℹ  ${inferredEn.length} product(s) had no language marker in the title and were set to English by default — review if any are actually Chinese/Japanese:`);
    for (const u of inferredEn) console.log(`   #${u.id}  ${u.title}`);
  }

  if (unresolved.length) {
    console.log(`\n⚠  ${unresolved.length} product(s) could not be fully classified — set them in Admin → Listings:`);
    for (const u of unresolved) {
      console.log(`   #${u.id}  ${u.title}   [lang: ${u.language || '?'} | type: ${u.sealedType || '?'}]`);
    }
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
