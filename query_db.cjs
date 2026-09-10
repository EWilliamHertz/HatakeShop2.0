const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const { rows } = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['supplier']);
  console.log(rows);
  process.exit(0);
}
run();
