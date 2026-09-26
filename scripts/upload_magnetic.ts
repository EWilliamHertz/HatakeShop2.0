import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { db } from './src/db/index.ts';
import { products } from './src/db/schema.ts';
import { generateEmbedding } from './src/lib/services.ts';

const SELLER_ID = 1; // TopBestPKG ID is 1 as queried
const BASE_DIR = "TopBestPKG/Magnetic holders";
const IMGUR_CLIENT_ID = "c46c37494f1c9c4"; 

async function uploadToImgur(base64: string) {
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
     const pt = folder; // e.g. "35PT", "100PT"
     const title = `${pt.toLowerCase()} Magnetic Card Holders`; // e.g. "35pt Magnetic Card Holders"

     const folderPath = path.join(BASE_DIR, folder);
     const files = fs.readdirSync(folderPath).filter(f => f.match(/\.(jpg|jpeg|png|JPG)$/));
     
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
     
     const description = `Premium magnetic card holders for trading cards. Size: ${pt}. Price is to be discussed via RFQ.`;
     const embedding = await generateEmbedding(`${title} ${description} Direct Factory TopBestPKG`);

     await db.insert(products).values({
        sellerId: SELLER_ID,
        title,
        description,
        moq: 100,
        offersOem: true,
        oemMoq: 500,
        unitCost: 0,
        originType: 'Direct Factory',
        leadTimeDays: 7,
        images: JSON.stringify(imageUrls),
        embedding,
        categoryId: null,
        productType: 'accessories', // Assuming magnetic card holders are accessories
        sealedType: 'supplies'
     });

     console.log(`Inserted ${title} with ${imageUrls.length} images.`);
  }
  
  console.log("Done uploading Magnetic Holders!");
  process.exit(0);
}

run().catch(console.error);
