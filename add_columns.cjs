const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
     await pool.query('ALTER TABLE users ADD COLUMN pending_company_name TEXT;');
     await pool.query('ALTER TABLE users ADD COLUMN pending_display_name TEXT;');
     console.log("Success");
  } catch(err) {
     console.error(err);
  } finally {
     pool.end();
  }
}
run();
