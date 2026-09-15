const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query("SELECT privilege_type FROM information_schema.column_privileges WHERE grantee = 'ai_studio_app_user' AND table_name = 'users' AND column_name = 'email'");
  console.log("Privileges on email:", res.rows);
  const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log("Columns:", res2.rows.map(r => r.column_name));
  client.end();
}).catch(console.error);
