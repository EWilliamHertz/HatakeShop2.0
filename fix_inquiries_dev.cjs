const { Client } = require('pg');
async function run() {
  const client = new Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: 'cloud_sql_development_database',
  });
  await client.connect();
  const qs = [
    "ALTER TABLE inquiries ADD COLUMN target_seller_id integer;",
    "ALTER TABLE inquiries ADD COLUMN is_blind_dropship boolean DEFAULT false;",
    "ALTER TABLE inquiries ADD COLUMN dropship_consumer_name text;",
    "ALTER TABLE inquiries ADD COLUMN dropship_consumer_address text;",
    "ALTER TABLE leads ADD COLUMN location text;",
    "ALTER TABLE leads ADD COLUMN segment text DEFAULT 'TCG';"
  ];
  for (const q of qs) {
    try {
      await client.query(q);
      console.log("OK");
    } catch(e) {
      console.log(e.message);
    }
  }
  await client.end();
}
run();
