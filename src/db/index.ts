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
      max: 10,
      idleTimeoutMillis: 15_000,
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
      const check = await pool.query(`
        SELECT count(*)::int AS cnt
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name IN ('language', 'sealed_type')
      `);
      if (Number(check.rows[0]?.cnt) >= 2) return;
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

let leadsCrmSchemaPromise: Promise<void> | null = null;
export function ensureLeadsCrmSchema(): Promise<void> {
  if (!leadsCrmSchemaPromise) {
    leadsCrmSchemaPromise = (async () => {
      const existingCheck = await pool.query(`
        SELECT
          (SELECT count(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name IN ('country', 'state', 'city', 'phone', 'notes', 'tags')) AS lead_cols,
          to_regclass('public.crm_mail_settings') IS NOT NULL AS has_settings
      `);
      if (Number(existingCheck.rows[0]?.lead_cols) >= 6 && existingCheck.rows[0]?.has_settings) {
        return;
      }
      await pool.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "country" text`);
      await pool.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "state" text`);
      await pool.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "city" text`);
      await pool.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone" text`);
      await pool.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" text`);
      await pool.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "leads_country_idx" ON "leads" ("country")`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "leads_state_idx" ON "leads" ("state")`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "leads_city_idx" ON "leads" ("city")`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" ("status")`);

      // Backfill city, state, and country on existing leads where country is not yet populated
      await pool.query(`
        UPDATE "leads"
        SET
          "city" = COALESCE(NULLIF(trim("city"), ''), NULLIF(trim(split_part("location", ',', 1)), '')),
          "state" = COALESCE(NULLIF(trim("state"), ''), NULLIF(trim(split_part("location", ',', 2)), '')),
          "country" = CASE
            WHEN trim(split_part("location", ',', 2)) IN ('Hamburg', 'Bremen', 'Berlin', 'Bayern', 'Hessen', 'Sachsen', 'Nordrhein-Westfalen', 'Niedersachsen', 'Baden-Württemberg') THEN 'Germany'
            WHEN lower("email") LIKE '%.se' THEN 'Sweden'
            WHEN lower("email") LIKE '%.de' THEN 'Germany'
            WHEN lower("email") LIKE '%.co.uk' OR lower("email") LIKE '%.uk' THEN 'United Kingdom'
            WHEN trim(split_part("location", ',', 2)) <> '' THEN 'United States'
            ELSE "country"
          END
        WHERE ("country" IS NULL OR "city" IS NULL) AND "location" IS NOT NULL AND trim("location") <> ''
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "crm_mail_settings" (
          "id" serial PRIMARY KEY,
          "name" text NOT NULL,
          "country" text,
          "state" text,
          "city" text,
          "segment" text,
          "language" text DEFAULT 'en',
          "sender_name" text DEFAULT 'Hatake B2B',
          "reply_to" text DEFAULT 'ernst@hatake.eu',
          "subject_template" text NOT NULL,
          "headline_template" text,
          "intro_template" text,
          "regional_note" text,
          "cta_text" text,
          "batch_size" integer DEFAULT 50,
          "is_default" boolean DEFAULT false,
          "updated_at" timestamp DEFAULT now(),
          "created_at" timestamp DEFAULT now()
        )
      `);

      const settingsCountRes = await pool.query('SELECT count(*) as count FROM "crm_mail_settings"');
      if (parseInt(settingsCountRes.rows[0]?.count || '0', 10) === 0) {
        await pool.query(`
          INSERT INTO "crm_mail_settings"
            ("name", "country", "state", "city", "segment", "language", "sender_name", "reply_to", "subject_template", "headline_template", "intro_template", "regional_note", "cta_text", "batch_size", "is_default")
          VALUES
            (
              'Global Default (English)',
              NULL, NULL, NULL, NULL, 'en',
              'Hatake B2B',
              'ernst@hatake.eu',
              '{{companyName}}, join Hatake.Shop B2B',
              '{{companyName}}, you''re invited.',
              'Hi {{firstName}}, we''d like to invite {{companyName}} to join Hatake B2B — the international wholesale network where verified TCG & collectibles stores source factory-direct accessories, Asian & English sealed product, and move inventory at scale.',
              NULL,
              'Create Your Company Profile',
              50,
              true
            ),
            (
              'United States — LGS & Hobby Stores',
              'United States', NULL, NULL, NULL, 'en',
              'Hatake B2B North America',
              'ernst@hatake.eu',
              'Wholesale TCG & Factory Accessories for {{companyName}} ({{city}})',
              '{{companyName}} — Wholesale Invitation for {{city}}, {{state}}',
              'Hi {{firstName}}, we''re onboarding leading card shops in {{city}}, {{state}} onto Hatake B2B. Source Japanese, Simplified Chinese & English Pokémon, One Piece, and factory-direct TopBestPKG binders, sleeves & magnetic holders at direct B2B rates.',
              'US Partner Dispatch: Tracked express air freight & direct factory OEM branding available for {{state}} storefronts.',
              'Claim {{companyName}} Wholesale Account',
              50,
              false
            ),
            (
              'Sweden / Sverige — Kortbutiker (Svenska)',
              'Sweden', NULL, NULL, NULL, 'sv',
              'Hatake B2B Sverige',
              'ernst@hatake.eu',
              '{{companyName}} ({{city}}) — Inbjudan till Hatake.Shop B2B',
              '{{companyName}}, välkommen till Hatake B2B.',
              'Hej {{firstName}}! Vi bjuder in utvalda kort- och hobbybutiker i {{city}} till Hatake B2B — vårt grossistnätverk för Pokémon, One Piece och fabrikstillverkade tillbehör (pärmar, toploaders, sleeves & akrylboxar) utan mellanhänder.',
              'Svensk support & snabb leverans direkt till er butik i {{city}}.',
              'Skapa Företagsprofil Gratis',
              50,
              false
            ),
            (
              'Germany / DACH — Fachhandel (Deutsch)',
              'Germany', NULL, NULL, NULL, 'de',
              'Hatake B2B DACH',
              'ernst@hatake.eu',
              '{{companyName}} ({{city}}) — B2B-Einladung zu Hatake.Shop',
              '{{companyName}}, Sie sind eingeladen.',
              'Hallo {{firstName}}, wir laden ausgewählte TCG- und Sammelkarten-Händler in {{city}} herzlich zu Hatake B2B ein — Ihrer Großhandelsplattform für versiegelte TCG-Produkte und Direktfabrik-Zubehör zu attraktiven Händlerkonditionen.',
              'Schneller EU-/Express-Versand für Fachhändler in {{city}}, {{country}}.',
              'Händlerkonto kostenlos erstellen',
              50,
              false
            )
        `);
      }
    })().catch((err: any) => {
      console.error('[db] Failed to ensure leads CRM schema:', err?.message || err);
      leadsCrmSchemaPromise = null;
      throw err;
    });
  }
  return leadsCrmSchemaPromise;
}

ensureLeadsCrmSchema().catch(() => {});


