const { Client } = require('pg');
async function addColumns(dbName) {
  const client = new Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: dbName,
  });
  await client.connect();
  console.log("Connected to", dbName);
  const queries = [
    "ALTER TABLE users ADD COLUMN store_slug text UNIQUE;",
    "ALTER TABLE users ADD COLUMN store_banner_url text;",
    "ALTER TABLE users ADD COLUMN store_policies text;",
    "ALTER TABLE users ADD COLUMN referred_by_id integer;",
    "ALTER TABLE users ADD COLUMN referral_code text UNIQUE;",
    "ALTER TABLE leads ADD COLUMN drip_step integer DEFAULT 1;",
    "ALTER TABLE leads ADD COLUMN last_emailed_at timestamp;",
    "ALTER TABLE leads ADD COLUMN referred_by_id integer;"
  ];
  for (let q of queries) {
    try { await client.query(q); console.log("OK"); } catch (e) { console.log(e.message) }
  }
  await client.end();
}
addColumns('cloud_sql_development_database');
