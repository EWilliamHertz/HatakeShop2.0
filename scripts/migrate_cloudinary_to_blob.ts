import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { put } from '@vercel/blob';
import { db } from '../src/db/index.js';
import { products, users, companies } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAPPING_FILE = path.join(__dirname, 'cloudinary_to_blob_mapping.json');

const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  'vercel_blob_rw_HFIaGc3PdKEKRKJs_RMHE5g8P7XtAWOCBR4vta7OyYDTRlO';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface MappingEntry {
  publicId: string;
  format: string;
  cloudinaryUrl: string;
  blobUrl: string;
  bytes: number;
  migratedAt: string;
}

function loadMapping(): Record<string, MappingEntry> {
  if (fs.existsSync(MAPPING_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveMapping(mapping: Record<string, MappingEntry>) {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2), 'utf-8');
}

function getMimeType(format: string): string {
  const f = (format || '').toLowerCase();
  switch (f) {
    case 'webp': return 'image/webp';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'avif': return 'image/avif';
    default: return 'application/octet-stream';
  }
}

async function fetchWithRetry(url: string, retries = 3): Promise<Buffer> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function getAllCloudinaryResources() {
  const resources: any[] = [];
  let nextCursor: string | undefined = undefined;

  console.log('Fetching image catalog from Cloudinary...');
  do {
    const res: any = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: nextCursor,
    });
    resources.push(...res.resources);
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return resources;
}

async function migrateImages() {
  console.log('=== Starting Cloudinary -> Vercel Blob Migration ===');
  console.log(`Blob Token: ${BLOB_TOKEN.slice(0, 20)}...`);

  const mapping = loadMapping();
  const existingCount = Object.keys(mapping).length;
  if (existingCount > 0) {
    console.log(`Loaded ${existingCount} previously migrated assets from ${path.basename(MAPPING_FILE)}`);
  }

  const resources = await getAllCloudinaryResources();
  console.log(`Found ${resources.length} total resources in Cloudinary account.\n`);

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Process images with concurrency pool of 5
  const CONCURRENCY = 5;
  for (let i = 0; i < resources.length; i += CONCURRENCY) {
    const chunk = resources.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (resource, chunkIdx) => {
        const index = i + chunkIdx + 1;
        const publicId = resource.public_id;
        const cloudinaryUrl = resource.secure_url;
        const format = resource.format || 'webp';

        // Check if already migrated
        if (mapping[publicId] || mapping[cloudinaryUrl]) {
          skippedCount++;
          return;
        }

        // Determine destination pathname in Vercel Blob
        const ext = format ? `.${format}` : '';
        const pathname = publicId.endsWith(ext)
          ? `cloudinary/${publicId}`
          : `cloudinary/${publicId}${ext}`;

        const mimeType = getMimeType(format);

        try {
          const buffer = await fetchWithRetry(cloudinaryUrl);
          const blob = await put(pathname, buffer, {
            access: 'public',
            token: BLOB_TOKEN,
            contentType: mimeType,
          });

          const entry: MappingEntry = {
            publicId,
            format,
            cloudinaryUrl,
            blobUrl: blob.url,
            bytes: resource.bytes || buffer.length,
            migratedAt: new Date().toISOString(),
          };

          mapping[publicId] = entry;
          mapping[cloudinaryUrl] = entry;
          successCount++;

          console.log(`[${index}/${resources.length}] Migrated: ${publicId} -> ${blob.url}`);
        } catch (err: any) {
          failedCount++;
          console.error(`[${index}/${resources.length}] FAILED ${publicId}:`, err.message);
        }
      })
    );

    // Save mapping periodically
    saveMapping(mapping);
  }

  saveMapping(mapping);
  console.log('\n=== Asset Migration Summary ===');
  console.log(`Total Cloudinary images: ${resources.length}`);
  console.log(`Newly uploaded:          ${successCount}`);
  console.log(`Previously skipped:      ${skippedCount}`);
  console.log(`Failed:                  ${failedCount}`);
  console.log(`Mapping stored at:       ${MAPPING_FILE}\n`);

  // Now update database references
  console.log('=== Updating Database References ===');
  await updateDatabaseReferences(mapping);
}

function findReplacement(url: string, mapping: Record<string, MappingEntry>): string | null {
  if (!url || typeof url !== 'string') return null;
  // Direct match on full Cloudinary URL
  if (mapping[url]) return mapping[url].blobUrl;

  // Match by public_id extracted from URL
  for (const entry of Object.values(mapping)) {
    if (url.includes(entry.publicId) || url === entry.cloudinaryUrl) {
      return entry.blobUrl;
    }
  }
  return null;
}

async function updateDatabaseReferences(mapping: Record<string, MappingEntry>) {
  try {
    // 1. Products
    const allProducts = await db.select().from(products);
    let updatedProducts = 0;

    for (const prod of allProducts) {
      let changed = false;
      let newImages: any = prod.images;
      let newSverigeImages: any = prod.sverigeImages;

      if (Array.isArray(prod.images)) {
        const mapped = prod.images.map((img: string) => {
          const rep = findReplacement(img, mapping);
          if (rep && rep !== img) {
            changed = true;
            return rep;
          }
          return img;
        });
        if (changed) newImages = mapped;
      }

      if (Array.isArray(prod.sverigeImages)) {
        let sverigeChanged = false;
        const mapped = prod.sverigeImages.map((img: string) => {
          const rep = findReplacement(img, mapping);
          if (rep && rep !== img) {
            sverigeChanged = true;
            return rep;
          }
          return img;
        });
        if (sverigeChanged) {
          changed = true;
          newSverigeImages = mapped;
        }
      }

      if (changed) {
        await db
          .update(products)
          .set({ images: newImages, sverigeImages: newSverigeImages })
          .where(eq(products.id, prod.id));
        updatedProducts++;
        console.log(`Updated product ID ${prod.id} (${prod.title}) with Vercel Blob images`);
      }
    }
    console.log(`Products updated in database: ${updatedProducts}`);

    // 2. Users
    const allUsers = await db.select().from(users);
    let updatedUsers = 0;

    for (const user of allUsers) {
      const updates: any = {};
      if (user.profilePictureUrl) {
        const rep = findReplacement(user.profilePictureUrl, mapping);
        if (rep && rep !== user.profilePictureUrl) updates.profilePictureUrl = rep;
      }
      if (user.bannerUrl) {
        const rep = findReplacement(user.bannerUrl, mapping);
        if (rep && rep !== user.bannerUrl) updates.bannerUrl = rep;
      }
      if (user.storeBannerUrl) {
        const rep = findReplacement(user.storeBannerUrl, mapping);
        if (rep && rep !== user.storeBannerUrl) updates.storeBannerUrl = rep;
      }

      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, user.id));
        updatedUsers++;
        console.log(`Updated user ID ${user.id} (${user.email})`);
      }
    }
    console.log(`Users updated in database: ${updatedUsers}`);

    // 3. Companies
    const allCompanies = await db.select().from(companies);
    let updatedCompanies = 0;

    for (const comp of allCompanies) {
      const updates: any = {};
      if (comp.logoUrl) {
        const rep = findReplacement(comp.logoUrl, mapping);
        if (rep && rep !== comp.logoUrl) updates.logoUrl = rep;
      }
      if (comp.bannerUrl) {
        const rep = findReplacement(comp.bannerUrl, mapping);
        if (rep && rep !== comp.bannerUrl) updates.bannerUrl = rep;
      }

      if (Object.keys(updates).length > 0) {
        await db.update(companies).set(updates).where(eq(companies.id, comp.id));
        updatedCompanies++;
        console.log(`Updated company ID ${comp.id} (${comp.name})`);
      }
    }
    console.log(`Companies updated in database: ${updatedCompanies}`);

    console.log('\nDatabase synchronization complete!');
  } catch (err: any) {
    console.error('Error updating database references:', err.message);
  }
}

migrateImages()
  .then(() => {
    console.log('\nMigration finished successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFatal error during migration:', err);
    process.exit(1);
  });
