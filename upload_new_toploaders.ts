import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from './src/db/index.js';
import { users, categories, products } from './src/db/schema.js';
import { generateEmbedding } from './src/lib/services.js';

const BASE_DIR = "new_toploaders";
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
  console.log("Looking up Phoebe's user ID...");
  const phoebe = await db.query.users.findFirst({
    where: (users, { ilike }) => ilike(users.email, "phoebe@topbestpkg.com")
  });
  
  if (!phoebe) {
    console.error("Could not find user phoebe@topbestpkg.com");
    process.exit(1);
  }
  const sellerId = phoebe.id;

  const folders = fs.readdirSync(BASE_DIR).filter(f => fs.statSync(path.join(BASE_DIR, f)).isDirectory());
  
  for (const folder of folders) {
     const title = `${folder} Toploaders`;
     const categoryId = 9; // Top-Loaders
     
     console.log(`\nProcessing product: ${title}`);
     
     // Check if product already exists
     const existing = await db.query.products.findFirst({
        where: (products, { and, eq }) => and(
          eq(products.sellerId, sellerId),
          eq(products.title, title)
        )
     });
     
     if (existing) {
         console.log(`Product ${title} already exists. Skipping upload, just updating MOQs later.`);
         continue;
     }

     const folderPath = path.join(BASE_DIR, folder);
     const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpeg'));
     
     const imageUrls = [];
     
     console.log(`Uploading ${files.length} images...`);

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
     
     const description = `Premium ${title}. Direct Factory. Please see images for details and colors.`;
     const embedding = await generateEmbedding(`${title} ${description} Direct Factory`).catch(() => null);

     console.log(`Inserting product into database...`);
     await db.insert(products).values({
        sellerId: sellerId,
        title,
        description,
        moq: 500, // as requested
        offersOem: true,
        oemMoq: 1000,
        unitCost: 0,
        originType: 'Direct Factory',
        leadTimeDays: 7,
        images: imageUrls,
        embedding,
        categoryId: categoryId,
        approvalStatus: 'approved',
        productType: 'sealed'
     });

     console.log(`Successfully inserted ${title} with ${imageUrls.length} images.`);
  }
  
  console.log("\nAll uploads done!");
  process.exit(0);
}

run().catch(console.error);
