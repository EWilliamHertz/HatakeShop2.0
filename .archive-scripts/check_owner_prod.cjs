const { Client } = require('pg');
async function run() {
  const client = new Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: 'cloud_sql_production_database',
  });
  await client.connect();
  const res = await client.query("SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public';");
  console.log(res.rows);
  await client.end();
}
run();
