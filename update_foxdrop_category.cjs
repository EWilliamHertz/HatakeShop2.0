const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const res = await client.query(`
    UPDATE products 
    SET category_id = 4, 
        category_ids = ARRAY[4]::int[]
    WHERE seller_id = 393
  `);
  
  console.log(`Successfully updated ${res.rowCount} products to the Pokemon category.`);
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
