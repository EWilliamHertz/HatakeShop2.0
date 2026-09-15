const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query('SELECT id, title, category_id, product_type, approval_status FROM products WHERE category_id = 4');
  console.log(res.rows);
  client.end();
}).catch(console.error);
