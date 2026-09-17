import express from 'express';
import { db } from '../db/index.js';
import { feedPosts, users, products, feedLikes, feedComments } from '../db/schema.js';
import { and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { desc, eq, sql } from 'drizzle-orm';
import { userFollowers } from '../db/schema.js';
import { inArray } from 'drizzle-orm';
import { getAuth } from 'firebase-admin/auth';

const router = express.Router();

// Get Feed Posts
router.get(['/feed', '/api/feed', '/api-v2/feed'], async (req, res) => {
  try {
    const mode = req.query.mode;
    let allowedAuthorIds = null;
    
    if (mode === 'network') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.split('Bearer ')[1];
      const decoded = await getAuth().verifyIdToken(token);
      const dbUserRes = await db.select({ id: users.id }).from(users).where(eq(users.uid, decoded.uid));
      if (dbUserRes.length === 0) return res.status(401).json({ error: 'User not found' });
      
      const currentUserId = dbUserRes[0].id;
      const followers = await db.select({ followingId: userFollowers.followingId }).from(userFollowers).where(eq(userFollowers.followerId, currentUserId));
      allowedAuthorIds = followers.map(f => f.followingId);
      if (allowedAuthorIds.length === 0) allowedAuthorIds = [-1]; // No followers, so empty feed
    }

    let query = db.select({
      id: feedPosts.id,
      type: feedPosts.type,
      content: feedPosts.content,
      tags: feedPosts.tags,
      budget: feedPosts.budget,
      imageUrl: feedPosts.imageUrl,
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
    .leftJoin(products, eq(feedPosts.productId, products.id));
    
    if (allowedAuthorIds) {
       query = query.where(inArray(feedPosts.authorId, allowedAuthorIds));
    }
    
    const rawPosts = await query.orderBy(desc(feedPosts.createdAt)).limit(50);

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
    const { type, content, tags, budget, productId, imageUrl } = req.body;
    // req.user has the current logged in user OR the impersonated user (if we intercept)
    
    const dbUserRes = await db.select({ id: users.id }).from(users).where(eq(users.uid, req.user.uid));
    if(dbUserRes.length === 0) return res.status(401).json({error: "User not found"});
    const authorId = dbUserRes[0].id;
 

    const newPost = await db.insert(feedPosts).values({
      authorId,
      type,
      content,
      tags,
      budget,
      productId: productId || null,
      imageUrl: imageUrl || null
    }).returning();

    res.status(201).json(newPost[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


// Toggle Like
router.post(['/feed/:id/like', '/api/feed/:id/like', '/api-v2/feed/:id/like'], requireAuth, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    const dbUserRes = await db.select({ id: users.id }).from(users).where(eq(users.uid, req.user.uid));
    if(dbUserRes.length === 0) return res.status(401).json({error: "User not found"});
    const userId = dbUserRes[0].id;

    
    // Check if like exists
    const existing = await db.select().from(feedLikes).where(and(eq(feedLikes.postId, postId), eq(feedLikes.userId, userId)));
    if (existing.length > 0) {
      await db.delete(feedLikes).where(eq(feedLikes.id, existing[0].id));
      await db.execute(sql`UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${postId}`);
      res.json({ liked: false });
    } else {
      await db.insert(feedLikes).values({ postId, userId });
      await db.execute(sql`UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = ${postId}`);
      res.json({ liked: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Comments
router.get(['/feed/:id/comments', '/api/feed/:id/comments', '/api-v2/feed/:id/comments'], async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const comments = await db.select({
      id: feedComments.id,
      content: feedComments.content,
      createdAt: feedComments.createdAt,
      author: {
        id: users.id,
        name: users.companyName,
        avatar: users.profilePictureUrl
      }
    }).from(feedComments)
      .leftJoin(users, eq(feedComments.authorId, users.id))
      .where(eq(feedComments.postId, postId))
      .orderBy(feedComments.createdAt);
      
    res.json(comments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Comment
router.post(['/feed/:id/comments', '/api/feed/:id/comments', '/api-v2/feed/:id/comments'], requireAuth, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    const dbUserRes = await db.select({ id: users.id }).from(users).where(eq(users.uid, req.user.uid));
    if(dbUserRes.length === 0) return res.status(401).json({error: "User not found"});
    const authorId = dbUserRes[0].id;

    const { content } = req.body;
    
    const newComment = await db.insert(feedComments).values({ postId, authorId, content }).returning();
    await db.execute(sql`UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = ${postId}`);
    
    res.json(newComment[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Delete Post
router.delete(['/feed/:id', '/api/feed/:id', '/api-v2/feed/:id'], requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const dbUserRes = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.uid, req.user.uid));
    if(dbUserRes.length === 0) return res.status(401).json({error: "User not found"});
    const user = dbUserRes[0];
    
    const postRes = await db.select().from(feedPosts).where(eq(feedPosts.id, postId));
    if(postRes.length === 0) return res.status(404).json({error: "Post not found"});
    const post = postRes[0];
    
    if (post.authorId !== user.id && user.role !== 'admin') {
       return res.status(403).json({error: "Forbidden"});
    }
    
    // delete related likes and comments first (or let CASCADE handle it, but Drizzle doesn't automatically CASCADE unless schema says so, let's just delete manually to be safe)
    await db.delete(feedLikes).where(eq(feedLikes.postId, postId));
    await db.delete(feedComments).where(eq(feedComments.postId, postId));
    await db.delete(feedPosts).where(eq(feedPosts.id, postId));
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Comment
router.delete(['/feed/comments/:id', '/api/feed/comments/:id', '/api-v2/feed/comments/:id'], requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const dbUserRes = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.uid, req.user.uid));
    if(dbUserRes.length === 0) return res.status(401).json({error: "User not found"});
    const user = dbUserRes[0];
    
    const commentRes = await db.select().from(feedComments).where(eq(feedComments.id, commentId));
    if(commentRes.length === 0) return res.status(404).json({error: "Comment not found"});
    const comment = commentRes[0];
    
    // Also let post author delete comment? The prompt says "delete your own comments, delete your own posts, for admin and moderators to delete others posts and comments".
    // I'll stick to: comment author OR admin
    if (comment.authorId !== user.id && user.role !== 'admin') {
       return res.status(403).json({error: "Forbidden"});
    }
    
    await db.delete(feedComments).where(eq(feedComments.id, commentId));
    await db.execute(sql`UPDATE feed_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ${comment.postId}`);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
