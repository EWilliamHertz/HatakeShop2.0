import express from 'express';
import { db } from '../db/index.js';
import { feedPosts, users, products } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { desc, eq, sql } from 'drizzle-orm';

const router = express.Router();

// Get Feed Posts
router.get(['/feed', '/api/feed', '/api-v2/feed'], async (req, res) => {
  try {
    const rawPosts = await db.select({
      id: feedPosts.id,
      type: feedPosts.type,
      content: feedPosts.content,
      tags: feedPosts.tags,
      budget: feedPosts.budget,
      likesCount: feedPosts.likesCount,
      commentsCount: feedPosts.commentsCount,
      createdAt: feedPosts.createdAt,
      author: {
        id: users.id,
        companyName: users.companyName,
        verificationStatus: users.verificationStatus,
        profilePictureUrl: users.profilePictureUrl,
      },
      product: {
        id: products.id,
        title: products.title,
        images: products.images,
        price: products.unitCost,
        moq: products.moq,
      }
    })
    .from(feedPosts)
    .leftJoin(users, eq(feedPosts.authorId, users.id))
    .leftJoin(products, eq(feedPosts.productId, products.id))
    .orderBy(desc(feedPosts.createdAt))
    .limit(50);

    const formattedPosts = rawPosts.map(p => ({
      ...p,
      author: {
        ...p.author,
        name: p.author?.companyName || 'Unknown',
        verified: p.author?.verificationStatus === 'verified',
        avatar: p.author?.profilePictureUrl
      },
      product: p.product?.id ? {
        ...p.product,
        image: Array.isArray(p.product.images) ? p.product.images[0] : (typeof p.product.images === 'string' ? JSON.parse(p.product.images)[0] : null)
      } : null
    }));

    res.json(formattedPosts);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create Feed Post
router.post(['/feed', '/api/feed', '/api-v2/feed'], requireAuth, async (req: any, res) => {
  try {
    const { type, content, tags, budget, productId } = req.body;
    // req.user has the current logged in user OR the impersonated user (if we intercept)
    const authorId = req.user.id; 

    const newPost = await db.insert(feedPosts).values({
      authorId,
      type,
      content,
      tags,
      budget,
      productId: productId || null
    }).returning();

    res.status(201).json(newPost[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
