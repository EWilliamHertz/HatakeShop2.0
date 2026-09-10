const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_ADMIN_USER, password: process.env.SQL_ADMIN_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  await client.query("UPDATE categories SET sort_order = 1 WHERE name = 'Pokémon'");
  client.end();
}).catch(console.error);
