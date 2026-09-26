import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';

const SELLER_ID = 1; // Phoebe's ID
const BASE_DIR = "Product Picture (Unzipped Files)";
const LOG_FILE = "/home/ewilliamhe/.gemini/antigravity-cli/brain/d15b6048-545c-4e3f-b615-9acb0b1cc799/.system_generated/tasks/task-760.log";

async function run() {
  const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
  
  // Extract From: <url> \n To: <path>
  const urlMap = {};
  const regex = /From: (https:\/\/drive\.google\.com\/uc\?id=[\w-]+)\r?\nTo: ([^\n]+)/g;
  let m;
  while ((m = regex.exec(logContent)) !== null) {
      const url = m[1].replace("drive.google.com/uc?id=", "lh3.googleusercontent.com/d/") + "=w1000";
      const filePath = m[2];
      const filename = path.basename(filePath);
      const folder = path.basename(path.dirname(filePath));
      if (!urlMap[folder]) urlMap[folder] = {};
      urlMap[folder][filename] = url;
  }

  const folders = fs.readdirSync(BASE_DIR).filter(f => fs.statSync(path.join(BASE_DIR, f)).isDirectory());
  
  for (const folder of folders) {
     const title = folder;
     let slots = "Unknown";
     const match = folder.match(/(\d+)\s*pocket/i);
     if (match) slots = match[1];

     const imageUrls = Object.values(urlMap[folder] || {});
     if (imageUrls.length === 0) continue;

     console.log(`Processing ${title}...`);
     
     const description = `Colors: Various colors available (see images). Slots: ${slots}. Price is to be discussed via RFQ.`;
     
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
        embedding: null,
        categoryId: null,
        approvalStatus: 'approved',
        productType: 'sealed'
     });

     console.log(`Inserted ${title} with ${imageUrls.length} images.`);
  }
  
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
