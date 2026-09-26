import { db } from '../src/db/index.js';
import { products } from '../src/db/schema.js';
import { adminDb } from '../src/lib/firebase-admin.js';
import { sql, like } from 'drizzle-orm';
import fetch from 'node-fetch';

async function migrateImages() {
  console.log("Fetching products with legacy images...");
  const rows = await db.select().from(products).where(sql`images::text LIKE '%/images/%'`);
  console.log(`Found ${rows.length} products to migrate.`);

  let migratedCount = 0;
  const IMGBB_KEY = process.env.VITE_IMGBB_API_KEY || '6f1a5bbe6a6a3a4fb49fd2f8b303d8f5';

  for (const product of rows) {
    try {
      let images: string[] = [];
      if (typeof product.images === 'string') {
        images = JSON.parse(product.images);
      } else if (Array.isArray(product.images)) {
        images = product.images;
      }
      
      let changed = false;
      const newImages = [...images];

      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        if (url.includes('/images/')) {
          // Extract firestore ID. It looks like /api/images/DOCUMENT_ID or /api/images/DOCUMENT_ID/filename
          const parts = url.split('/images/')[1].split('/');
          const docId = parts[0];
          
          console.log(`Fetching doc ${docId} for product ${product.id}...`);
          const doc = await adminDb.collection('uploaded_images').doc(docId).get();
          if (!doc.exists) {
            console.log(`Doc ${docId} not found, skipping this image.`);
            continue;
          }
          const base64DataUrl = doc.data()?.data;
          if (!base64DataUrl) continue;

          // upload to imgbb
          const matches = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches) continue;
          
          const b64 = matches[2];
          const formData = new URLSearchParams();
          formData.append('image', b64);
          
          console.log(`Uploading to ImgBB...`);
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
            method: 'POST',
            body: formData
          });
          const json = await res.json();
          if (json.data && json.data.url) {
            newImages[i] = json.data.url;
            changed = true;
            console.log(`Success -> ${json.data.url}`);
            
            // Delete from firestore to free up space!
            await adminDb.collection('uploaded_images').doc(docId).delete();
            console.log(`Deleted doc ${docId} from Firestore.`);
          } else {
            console.error(`ImgBB upload failed:`, json);
          }
        }
      }

      if (changed) {
        await db.update(products).set({ images: newImages }).where(sql`id = ${product.id}`);
        console.log(`Updated product ${product.id}`);
        migratedCount++;
      }
    } catch (e) {
      console.error(`Error migrating product ${product.id}:`, e);
    }
  }

  console.log(`Migration complete! Migrated ${migratedCount} products.`);
  process.exit(0);
}

migrateImages().catch(console.error);
