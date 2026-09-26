/**
 * scripts/add_indexes.ts
 * Idempotent — safe to run multiple times.
 * Run against prod: npx tsx scripts/add_indexes.ts
 */
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const stmts = [
  // --- Products ---
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS products_approval_status_idx ON products (approval_status)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS products_seller_id_idx ON products (seller_id)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS products_category_id_idx ON products (category_id)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS products_created_at_idx ON products (created_at DESC)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS products_sponsored_idx ON products (is_sponsored) WHERE is_sponsored = true`,
  // Full-text search (replaces slow ilike '%q%')
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS products_fts_idx ON products USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')))`,
  // Trigram fuzzy search (typo-tolerant)
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS products_title_trgm_idx ON products USING gin (title gin_trgm_ops)`,
  // --- Users ---
  `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_unique_lower_idx ON users (lower(email))`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS users_store_slug_idx ON users (store_slug) WHERE store_slug IS NOT NULL`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS users_role_idx ON users (role)`,
  // --- Inquiry messages ---
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages (inquiry_id)`,
  // --- Wishlists / leads ---
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS wishlists_user_idx ON wishlists (user_id)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_status_idx ON leads (status)`,
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

  // CONCURRENTLY cannot run inside a transaction, so use a raw client (not pooled).
  const client = new Client({ connectionString: url });
  await client.connect();

  console.log(`Running ${stmts.length} index migrations...`);
  let ok = 0, warn = 0;
  for (const stmt of stmts) {
    try {
      await client.query(stmt);
      console.log(`  ✓  ${stmt.slice(0, 85)}...`);
      ok++;
    } catch (e: any) {
      console.warn(`  ⚠  ${e.message}`);
      warn++;
    }
  }

  await client.end();
  console.log(`\nDone. ${ok} succeeded, ${warn} warnings.`);
}

main().catch(e => { console.error(e); process.exit(1); });
