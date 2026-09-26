import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';
import { generateEmbedding } from './src/lib/services.js';

const SELLER_ID = 1; // Phoebe's ID
const BASE_DIR = "Product Picture (Unzipped Files)";
const IMGUR_CLIENT_ID = "c46c37494f1c9c4"; // A generic public Imgur Client-ID often used in open source

async function uploadToImgur(base64) {
    const res = await fetch("https://api.imgur.com/3/image", {
        method: "POST",
        headers: {
            "Authorization": `Client-ID ${IMGUR_CLIENT_ID}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: base64, type: "base64" })
    });
    const json = await res.json();
    if (!json.success) throw new Error("Imgur upload failed: " + JSON.stringify(json));
    return json.data.link;
}

async function run() {
  const folders = fs.readdirSync(BASE_DIR).filter(f => fs.statSync(path.join(BASE_DIR, f)).isDirectory());
  
  for (const folder of folders) {
     const title = folder;
     let slots = "Unknown";
     const match = folder.match(/(\d+)\s*pocket/i);
     if (match) slots = match[1];

     const folderPath = path.join(BASE_DIR, folder);
     const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg') || f.endsWith('.JPG'));
     
     const imageUrls = [];
     
     console.log(`Processing ${title}...`);

     for (const file of files) {
        const filePath = path.join(folderPath, file);
        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        
        console.log(`Uploading ${file} to Imgur...`);
        try {
            const url = await uploadToImgur(base64);
            imageUrls.push(url);
        } catch(e) {
            console.error(e);
        }
     }
     
     const description = `Colors: Various colors available (see images). Slots: ${slots}. Price is to be discussed via RFQ.`;
     const embedding = await generateEmbedding(`${title} ${description} Direct Factory`);

     await db.insert(products).values({
        sellerId: SELLER_ID,
        title,
        description,
        moq: 50,
        offersOem: true,
        oemMoq: 100,
        unitCost: 0,
        originType: 'Direct Factory',
        leadTimeDays: 7,
        images: imageUrls,
        embedding,
        categoryId: null,
        productType: 'sealed'
     });

     console.log(`Inserted ${title} with ${imageUrls.length} images.`);
  }
  
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
