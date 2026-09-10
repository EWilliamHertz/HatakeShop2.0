const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query("SELECT password FROM users LIMIT 1");
  console.log("Select password succeeded");
  client.end();
}).catch(console.error);
