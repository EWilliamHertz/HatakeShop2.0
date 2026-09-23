import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { db } from './src/db/index.ts';
import { products } from './src/db/schema.ts';

const SELLER_ID = 1; 
const BASE_DIR = "TopBestPKG/Magnetic holders";
const IMGBB_KEY = process.env.VITE_IMGBB_API_KEY || "6f1a5bbe6a6a3a4fb49fd2f8b303d8f5";

async function uploadToImgbb(base64: string) {
    const formData = new URLSearchParams();
    formData.append('image', base64);
    
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: "POST",
        body: formData
    });
    const json = await res.json();
    if (!json.success) throw new Error("ImgBB upload failed: " + JSON.stringify(json));
    return json.data.url;
}

async function run() {
  const folders = fs.readdirSync(BASE_DIR).filter(f => fs.statSync(path.join(BASE_DIR, f)).isDirectory());
  
  for (const folder of folders) {
     const pt = folder; 
     const title = `${pt.toLowerCase()} Magnetic Card Holders`; 

     const folderPath = path.join(BASE_DIR, folder);
     const files = fs.readdirSync(folderPath).filter(f => f.match(/\.(jpg|jpeg|png|JPG)$/));
     
     const imageUrls = [];
     
     console.log(`Processing ${title}...`);

     for (const file of files) {
        const filePath = path.join(folderPath, file);
        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        
        console.log(`Uploading ${file} to ImgBB...`);
        try {
            const url = await uploadToImgbb(base64);
            imageUrls.push(url);
        } catch(e) {
            console.error(e);
        }
     }
     
     const description = `Premium magnetic card holders for trading cards. Size: ${pt}. Price is to be discussed via RFQ.`;

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
        embedding: null,
        categoryId: null,
        productType: 'accessories', 
        sealedType: 'supplies'
     });

     console.log(`Inserted ${title} with ${imageUrls.length} images.`);
  }
  
  console.log("Done uploading Magnetic Holders!");
  process.exit(0);
}

run().catch(console.error);
