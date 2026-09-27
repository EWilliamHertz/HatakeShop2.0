import dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/db/index';
import { products, users } from '../src/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function migrateImages() {
  console.log("Starting ImgBB -> Cloudinary migration...");
  let migratedCount = 0;

  // Migrate Products
  const allProducts = await db.select().from(products);
  for (const prod of allProducts) {
    if (!prod.images || !Array.isArray(prod.images)) continue;
    
    let changed = false;
    const newImages = [];

    for (const url of prod.images) {
      if (typeof url === 'string' && (url.includes('ibb.co') || url.includes('imgbb'))) {
        try {
          console.log(`Migrating product image: ${url}`);
          const result = await cloudinary.uploader.upload(url, {
            folder: 'hatake-shop/products',
            format: 'webp',
            quality: 'auto:best'
          });
          newImages.push(result.secure_url);
          changed = true;
          migratedCount++;
        } catch (err: any) {
          console.error(`Failed to migrate ${url}:`, err.message);
          newImages.push(url); // Keep original on failure
        }
      } else {
        newImages.push(url);
      }
    }

    if (changed) {
      await db.update(products).set({ images: newImages }).where(eq(products.id, prod.id));
      console.log(`Updated product ID ${prod.id}`);
    }
  }

  // Migrate Users (Banners and Profile Pics)
  const allUsers = await db.select().from(users);
  for (const user of allUsers) {
    let updates: any = {};
    
    if (user.profilePictureUrl && (user.profilePictureUrl.includes('ibb.co') || user.profilePictureUrl.includes('imgbb'))) {
      try {
        console.log(`Migrating profile pic: ${user.profilePictureUrl}`);
        const result = await cloudinary.uploader.upload(user.profilePictureUrl, {
          folder: 'hatake-shop/profiles', format: 'webp', quality: 'auto:best'
        });
        updates.profilePictureUrl = result.secure_url;
        migratedCount++;
      } catch (e) {}
    }

    if (user.bannerUrl && (user.bannerUrl.includes('ibb.co') || user.bannerUrl.includes('imgbb'))) {
      try {
        console.log(`Migrating banner: ${user.bannerUrl}`);
        const result = await cloudinary.uploader.upload(user.bannerUrl, {
          folder: 'hatake-shop/banners', format: 'webp', quality: 'auto:best'
        });
        updates.bannerUrl = result.secure_url;
        migratedCount++;
      } catch (e) {}
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, user.id));
      console.log(`Updated user ID ${user.id}`);
    }
  }

  console.log(`Migration complete! Successfully moved ${migratedCount} images to Cloudinary.`);
  process.exit(0);
}

migrateImages();
