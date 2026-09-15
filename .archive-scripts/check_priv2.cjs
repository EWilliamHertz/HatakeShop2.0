const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query("SELECT privilege_type FROM information_schema.table_privileges WHERE grantee = 'ai_studio_app_user' AND table_name = 'users'");
  console.log("Privileges on users table:", res.rows);
  client.end();
}).catch(console.error);
