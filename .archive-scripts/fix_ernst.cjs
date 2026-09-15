const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_ADMIN_USER, password: process.env.SQL_ADMIN_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query("UPDATE users SET role = 'admin', password = 'Yb07tw44!' WHERE email = 'ernst@hatake.eu' RETURNING *");
  console.log("Updated:", res.rows);
  client.end();
}).catch(console.error);
