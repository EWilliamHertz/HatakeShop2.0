import { Router } from 'express';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post(["/upload", "/api/upload", "/api-v2/upload"], requireAuth, async (req, res) => {
  try {
    const { image, filename, folder } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'No image provided' });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      let buffer: Buffer;
      let contentType = 'image/jpeg';

      const dataUrlMatch = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (dataUrlMatch) {
        contentType = dataUrlMatch[1];
        buffer = Buffer.from(dataUrlMatch[2], 'base64');
      } else if (image.startsWith('http://') || image.startsWith('https://')) {
        const fetched = await fetch(image);
        if (!fetched.ok) throw new Error(`Failed to fetch remote image (${fetched.status})`);
        contentType = fetched.headers.get('content-type') || 'image/jpeg';
        buffer = Buffer.from(await fetched.arrayBuffer());
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
      };
      const ext = extMap[contentType.toLowerCase()] || 'jpg';
      const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '');
      const safeBase = filename
        ? String(filename).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)
        : `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
      const pathname = `${safeFolder}/${safeBase}-${hash}.${ext}`;

      const blob = await put(pathname, buffer, {
        access: 'public',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType,
        token: blobToken,
      });

      return res.json({ success: true, url: blob.url });
    }

    // Fallback to Cloudinary only if no Vercel Blob token is configured
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(image, {
      folder: 'hatake-shop',
      format: 'webp',
      quality: 'auto:best',
      width: 1200,
      crop: 'limit',
    });

    return res.json({ success: true, url: result.secure_url });
  } catch (error: any) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

export default router;
