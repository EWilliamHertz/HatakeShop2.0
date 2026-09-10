const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: process.env.SQL_DB_NAME, connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query('SELECT * FROM products WHERE category_id = 4');
  console.log("Count for category 4:", res.rows.length);
  client.end();
}).catch(console.error);
