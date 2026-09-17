import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_emails JSONB DEFAULT '[]'::jsonb;
  `);
  console.log("Notification emails column added");
  process.exit(0);
}
run();
