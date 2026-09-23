const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const csvContent = fs.readFileSync('./foxdrop_import.csv', 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  console.log(`Found ${records.length} products to insert for FoxDrop.`);
  let count = 0;
  
  for (const record of records) {
    const title = record['Product'];
    const desc = record['Configuration'] || title;
    let priceStr = record['Price'].replace('€', '').replace(',', '').trim();
    if (!priceStr || isNaN(Number(priceStr))) {
        priceStr = "0";
    }

    const imageFilename = record['Image_File'];
    const imageUrl = `/images/foxdrop/${imageFilename}`;

    await client.query(`
      INSERT INTO products 
      (seller_id, title, description, unit_cost, stock_quantity, moq, origin_type, lead_time_days, images, brand, approval_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      393, // sellerId for info@foxdropstore.com
      title,
      desc,
      priceStr,
      100, // default stock
      1, // default moq
      'warehouse',
      2, // lead time
      JSON.stringify([imageUrl]), // jsonb images
      'Pokemon',
      'approved' // Push to marketplace
    ]);
    count++;
  }

  console.log(`Successfully uploaded and approved ${count} products to the marketplace!`);
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
