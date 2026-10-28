import { Router } from 'express';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CACHE_DIR = path.resolve(process.env.IMAGE_CACHE_DIR || '/tmp/hatake-img-cache');
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {}
}

const ALLOWED_HOSTS = new Set([
  'hfiagc3pdkekrkjs.public.blob.vercel-storage.com',
  'i.ibb.co',
  'res.cloudinary.com',
  'images.unsplash.com',
  'localhost',
  '127.0.0.1'
]);

const inFlight = new Map<string, Promise<Buffer>>();

/**
 * High-performance image proxy & resizing endpoint.
 * Converts large (1MB - 6MB) camera uploads into crisp, lightweight WebP
 * thumbnails (~15KB - 30KB) with permanent immutable caching.
 */
router.get(['/image-proxy', '/api/image-proxy', '/api-v2/image-proxy'], async (req, res) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  let parsed: URL;
  try {
    parsed = rawUrl.startsWith('/')
      ? new URL(`http://127.0.0.1:${process.env.PORT || 3000}${rawUrl}`)
      : new URL(rawUrl);
  } catch {
    return res.status(400).send('Invalid url');
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowedHost =
    ALLOWED_HOSTS.has(hostname) ||
    hostname.endsWith('.vercel-storage.com') ||
    hostname.endsWith('.public.blob.vercel-storage.com') ||
    hostname.endsWith('.ibb.co') ||
    rawUrl.startsWith('/images/') ||
    rawUrl.startsWith('/');

  if (!isAllowedHost) {
    return res.status(403).send('Image host not permitted');
  }

  const width = Math.min(1600, Math.max(50, parseInt(req.query.w as string || '600', 10) || 600));
  const quality = Math.min(100, Math.max(50, parseInt(req.query.q as string || '80', 10) || 80));

  const cacheKey = crypto
    .createHash('md5')
    .update(`${rawUrl}_w${width}_q${quality}`)
    .digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.webp`);

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  if (fs.existsSync(cacheFile)) {
    return fs.createReadStream(cacheFile).pipe(res);
  }

  try {
    let job = inFlight.get(cacheKey);
    if (!job) {
      job = (async () => {
        let inputBuffer: Buffer;
        if (rawUrl.startsWith('/images/')) {
          const localPath = path.join(process.cwd(), 'public', rawUrl);
          if (fs.existsSync(localPath)) {
            inputBuffer = await fs.promises.readFile(localPath);
          } else {
            const resp = await fetch(parsed.href, { signal: AbortSignal.timeout(10000) });
            if (!resp.ok) throw new Error(`Upstream returned ${resp.status}`);
            inputBuffer = Buffer.from(await resp.arrayBuffer());
          }
        } else {
          const resp = await fetch(parsed.href, {
            headers: { 'User-Agent': 'HatakeImageProxy/1.0' },
            signal: AbortSignal.timeout(12000)
          });
          if (!resp.ok) throw new Error(`Upstream returned ${resp.status}`);
          inputBuffer = Buffer.from(await resp.arrayBuffer());
        }

        const webpBuf = await sharp(inputBuffer)
          .resize(width, width, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();

        try {
          await fs.promises.writeFile(cacheFile, webpBuf);
        } catch (e) {}

        return webpBuf;
      })();

      inFlight.set(cacheKey, job);
      job.finally(() => inFlight.delete(cacheKey));
    }

    const result = await job;
    return res.end(result);
  } catch (err: any) {
    console.error('Image proxy optimization error:', err.message, 'for', rawUrl);
    // Graceful fallback: redirect directly to original source
    return res.redirect(rawUrl);
  }
});

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
