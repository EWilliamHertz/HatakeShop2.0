const { Client } = require('pg');
async function run() {
  const client = new Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: 'cloud_sql_development_database',
  });
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='leads';");
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}
run();
