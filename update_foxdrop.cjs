const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  // 1. Verify User
  await client.query(`UPDATE users SET verification_status = 'verified' WHERE email = 'info@foxdropstore.com'`);
  console.log("Verified info@foxdropstore.com");

  const csvContent = fs.readFileSync('./foxdrop_import.csv', 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  console.log(`Processing ${records.length} products...`);
  
  for (const record of records) {
    const title = record['Product'];
    const desc = record['Configuration'] || title;
    
    // Parse MOQ
    let moq = 1;
    const match = desc.match(/(\d+)\s*Box/i);
    if (match) {
        moq = parseInt(match[1], 10);
    } else if (desc.toLowerCase().includes('case')) {
        // Just case but no box number, default to 20 maybe? Or parse further if needed
        const match2 = desc.match(/(\d+)\s*pcs/i);
        if (match2) moq = parseInt(match2[1], 10);
    }
    
    // Fallback if moq is 1 but they wanted "1 case":
    // some are "Box", some are "Tin Set", some are "Promo Pack".
    
    // Upload image to ImgBB
    const imageFilename = record['Image_File'];
    const imagePath = `./output_images/${imageFilename}`;
    let remoteUrl = `/images/foxdrop/${imageFilename}`; // fallback
    
    if (fs.existsSync(imagePath)) {
        const formData = new FormData();
        const blob = new Blob([fs.readFileSync(imagePath)]);
        formData.append('image', blob, imageFilename);
        
        try {
            const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=6f1a5bbe6a6a3a4fb49fd2f8b303d8f5`, {
                method: 'POST',
                body: formData
            });
            const data = await uploadRes.json();
            if (data && data.success) {
                remoteUrl = data.data.url;
            }
        } catch (e) {
            console.error(`Failed to upload ${imageFilename}`, e.message);
        }
    }

    await client.query(`
      UPDATE products 
      SET images = $1, moq = $2 
      WHERE seller_id = 393 AND title = $3 AND description = $4
    `, [
      JSON.stringify([remoteUrl]),
      moq,
      title,
      desc
    ]);
    process.stdout.write('.');
  }

  console.log(`\nSuccessfully updated products with ImgBB URLs and new MOQ!`);
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
