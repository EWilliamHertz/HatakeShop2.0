const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: 'cloud_sql_development_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  await client.query("UPDATE categories SET sort_order = 1 WHERE name = 'Pokemon'");
  client.end();
}).catch(console.error);
