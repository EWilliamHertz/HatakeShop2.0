const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_ADMIN_USER, password: process.env.SQL_ADMIN_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  await client.query("UPDATE categories SET parent_id = null WHERE name = 'Pokémon'");
  const res = await client.query("SELECT * FROM categories WHERE name = 'Pokémon'");
  console.log(res.rows);
  client.end();
}).catch(console.error);
