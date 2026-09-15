const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: process.env.SQL_DB_NAME,
  max: 1
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Also grant permissions to SQL_USER
    await pool.query(`
      GRANT ALL PRIVILEGES ON TABLE feedback TO ${process.env.SQL_USER};
      GRANT USAGE, SELECT ON SEQUENCE feedback_id_seq TO ${process.env.SQL_USER};
    `);
    console.log("Created feedback table and granted permissions");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
