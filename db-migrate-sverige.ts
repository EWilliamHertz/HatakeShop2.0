import 'dotenv/config';
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sverige_price NUMERIC`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sverige_images JSONB`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sverige_title TEXT`);
    console.log("Migration successful");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
main();
