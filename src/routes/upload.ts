import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post(["/upload", "/api/upload", "/api-v2/upload"], requireAuth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Configure Cloudinary dynamically (Vercel will inject these env vars)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Upload to Cloudinary, forcing WebP format and auto-quality for max compression
    const result = await cloudinary.uploader.upload(image, {
      folder: 'hatake-shop',
      format: 'webp',
      quality: 'auto:best',
      width: 1200,
      crop: 'limit'
    });

    res.json({ success: true, url: result.secure_url });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

export default router;
