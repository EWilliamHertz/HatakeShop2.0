const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const { rows } = await pool.query('SELECT uid, COUNT(*) FROM users GROUP BY uid HAVING COUNT(*) > 1');
  console.log(rows);
  process.exit(0);
}
run();
