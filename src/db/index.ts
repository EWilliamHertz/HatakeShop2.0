import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    // SSL is required for hosted DBs (Neon, Cloud SQL). Allow opting out for
    // local development databases via `?sslmode=disable` or PGSSL=disable.
    const url = process.env.DATABASE_URL || '';
    const sslDisabled = /sslmode=disable/.test(url) || process.env.PGSSL === 'disable';
    const config: pg.PoolConfig = {
      max: 10,
      connectionTimeoutMillis: 30000,
      ssl: sslDisabled ? false : true,
    };
    
    if (process.env.DATABASE_URL) {
      config.connectionString = process.env.DATABASE_URL;
    } else {
      config.host = process.env.SQL_HOST;
      config.user = process.env.SQL_USER;
      config.password = process.env.SQL_PASSWORD;
      config.database = process.env.SQL_DB_NAME;
    }

    global._postgresPool = new Pool(config);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

/**
 * Self-healing schema guard for the sealed-product taxonomy (PR #2 / 0006_sealed_taxonomy.sql).
 *
 * The marketplace, sneak-peek, seller and admin routes select `products.language` and
 * `products.sealed_type`. If the 0006 migration has not been applied to the database yet
 * (e.g. a fresh Neon/Cloud SQL database, or a deploy that went out before `drizzle-kit run`),
 * every query touching those columns fails with "column does not exist" and the whole
 * storefront appears empty (no products, no companies).
 *
 * This guard applies the exact same idempotent DDL as drizzle/0006_sealed_taxonomy.sql.
 * It runs once per process (memoized) and is cheap/no-op when the columns already exist.
 */
let taxonomySchemaPromise: Promise<void> | null = null;
export function ensureSealedTaxonomySchema(): Promise<void> {
  if (!taxonomySchemaPromise) {
    taxonomySchemaPromise = (async () => {
      await pool.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "language" text`);
      await pool.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sealed_type" text`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "products_language_idx" ON "products" ("language")`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "products_sealed_type_idx" ON "products" ("sealed_type")`);
    })().catch((err: any) => {
      console.error('[db] Failed to ensure sealed-taxonomy schema columns:', err?.message || err);
      // Reset so a later request can retry (e.g. after transient connectivity issues).
      taxonomySchemaPromise = null;
      throw err;
    });
  }
  return taxonomySchemaPromise;
}

// Heal the schema on boot (fire-and-forget): every cold start self-repairs the database.
ensureSealedTaxonomySchema().catch(() => { /* logged inside the guard */ });

