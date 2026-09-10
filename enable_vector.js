const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log('Extension pgvector enabled.');
  await client.end();
}

run().catch(err => console.error(err));
