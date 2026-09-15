import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';
import { adminDb } from './src/lib/firebase-admin.js';
import { generateEmbedding } from './src/lib/services.js';

const SELLER_ID = 1; // Phoebe's ID
const BASE_DIR = "Product Picture (Unzipped Files)";

async function run() {
  const folders = fs.readdirSync(BASE_DIR).filter(f => fs.statSync(path.join(BASE_DIR, f)).isDirectory());
  
  for (const folder of folders) {
     const title = folder;
     let slots = "Unknown";
     const match = folder.match(/(\d+)\s*pocket/i);
     if (match) slots = match[1];

     const folderPath = path.join(BASE_DIR, folder);
     const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'));
     
     const imageUrls = [];
     
     console.log(`Processing ${title}...`);

     for (const file of files) {
        const filePath = path.join(folderPath, file);
        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const docRef = await adminDb.collection("uploaded_images").add({
           data: dataUrl,
           uploader: "auto_script",
           createdAt: new Date()
        });
        
        imageUrls.push(`/api-v2/images/${docRef.id}/${encodeURIComponent(file)}`);
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
        categoryId: null, // or appropriate category
        productType: 'sealed' // or appropriate
     });

     console.log(`Inserted ${title} with ${imageUrls.length} images.`);
  }
  
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
