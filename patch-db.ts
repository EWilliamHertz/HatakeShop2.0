import 'dotenv/config';
import pg from 'pg';

async function patch() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_sverige_b2c BOOLEAN DEFAULT false');
    console.log("Column added successfully");
  } catch (e) {
    console.error("Failed to add column:", e);
  } finally {
    pool.end();
  }
}
patch();
