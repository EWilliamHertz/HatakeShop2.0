const fs = require('fs');
let code = fs.readFileSync('src/routes/feed.ts', 'utf8');

if(!code.includes('feedLikes')) {
    code = code.replace(/import \{ feedPosts, users, products \} from '\.\.\/db\/schema\.js';/, "import { feedPosts, users, products, feedLikes, feedComments } from '../db/schema.js';\nimport { and } from 'drizzle-orm';");
}

const newRoutes = `
// Toggle Like
router.post(['/feed/:id/like', '/api/feed/:id/like', '/api-v2/feed/:id/like'], requireAuth, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
    
    // Check if like exists
    const existing = await db.select().from(feedLikes).where(and(eq(feedLikes.postId, postId), eq(feedLikes.userId, userId)));
    if (existing.length > 0) {
      await db.delete(feedLikes).where(eq(feedLikes.id, existing[0].id));
      await db.execute(sql\`UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = \${postId}\`);
      res.json({ liked: false });
    } else {
      await db.insert(feedLikes).values({ postId, userId });
      await db.execute(sql\`UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = \${postId}\`);
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
    const authorId = req.user.id;
    const { content } = req.body;
    
    const newComment = await db.insert(feedComments).values({ postId, authorId, content }).returning();
    await db.execute(sql\`UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = \${postId}\`);
    
    res.json(newComment[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('/feed/:id/like')) {
  code = code.replace(/export default router;/, newRoutes + '\nexport default router;');
  fs.writeFileSync('src/routes/feed.ts', code);
  console.log('API routes added to feed.ts');
}
