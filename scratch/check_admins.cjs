const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT email, role FROM users WHERE role = 'admin'");
  console.log('Admin users:');
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
