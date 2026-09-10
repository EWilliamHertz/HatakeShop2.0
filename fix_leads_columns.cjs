const { Client } = require('pg');
async function run() {
  const client = new Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: 'cloud_sql_production_database',
  });
  await client.connect();
  try {
    await client.query("ALTER TABLE leads ADD COLUMN location text;");
    console.log("added location");
  } catch(e) { console.log(e.message) }
  
  try {
    await client.query("ALTER TABLE leads ADD COLUMN segment text DEFAULT 'TCG';");
    console.log("added segment");
  } catch(e) { console.log(e.message) }
  await client.end();
}
run();
