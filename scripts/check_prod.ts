const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log("Has password column:", res.rows.map(r => r.column_name).includes('password'));
  client.end();
}).catch(console.error);
