import 'dotenv/config';
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
    let url = process.env.DATABASE_URL || '';
    // Strip channel_binding=require which is meant for psql but unsupported in Node pg driver
    url = url.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?&/, '?').replace(/\?$/, '');

    const sslDisabled = /sslmode=disable/.test(url) || process.env.PGSSL === 'disable';
    const config: pg.PoolConfig = {
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 30000,
      ssl: sslDisabled ? false : { rejectUnauthorized: false },
    };
    
    if (url) {
      config.connectionString = url;
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

let swedishCardShopsSchemaPromise: Promise<void> | null = null;
export function ensureSwedishCardShopsSchema(): Promise<void> {
  if (!swedishCardShopsSchemaPromise) {
    swedishCardShopsSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "swedish_card_shops" (
          "id" serial PRIMARY KEY,
          "name" text NOT NULL,
          "type" text,
          "city" text,
          "address" text,
          "phone" text,
          "email" text,
          "website" text,
          "card_types" text,
          "notes" text,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
      try {
        const countRes = await pool.query('SELECT count(*) as count FROM "swedish_card_shops"');
        if (parseInt(countRes.rows[0]?.count || '0', 10) === 0) {
          const { seedSwedishShopsFromDisk } = await import('../lib/swedishShops.js');
          await seedSwedishShopsFromDisk(pool);
        }
      } catch (e: any) {
        console.warn('[db] Note on swedish_card_shops initial seeding:', e.message);
      }
    })().catch((err: any) => {
      console.error('[db] Failed to ensure swedish_card_shops schema:', err?.message || err);
      swedishCardShopsSchemaPromise = null;
      throw err;
    });
  }
  return swedishCardShopsSchemaPromise;
}

ensureSwedishCardShopsSchema().catch(() => {});


