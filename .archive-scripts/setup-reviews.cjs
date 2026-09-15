const fs = require('fs');

// 1. Add endpoint to src/routes/products.ts
let productsTs = fs.readFileSync('src/routes/products.ts', 'utf-8');
const reviewEndpoint = `
router.get('/:id/reviews', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const productReviews = await db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      reviewerName: users.displayName
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.targetProductId, productId))
    .orderBy(desc(reviews.createdAt));
    res.json(productReviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reviews', requireAuth, async (req: any, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { rating, comment } = req.body;
    const userProfile = await getUserProfile(req.user!.uid);
    await db.insert(reviews).values({
      reviewerId: userProfile.id,
      targetProductId: productId,
      rating,
      comment
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
`;
// find the end of the router exports
productsTs = productsTs.replace('export default router;', reviewEndpoint + '\nexport default router;');
// add imports
if (!productsTs.includes('reviews')) {
  productsTs = productsTs.replace('import { products,', 'import { products, reviews, users,');
}
if (!productsTs.includes('desc')) {
  productsTs = productsTs.replace('import { eq', 'import { eq, desc');
}
fs.writeFileSync('src/routes/products.ts', productsTs);
