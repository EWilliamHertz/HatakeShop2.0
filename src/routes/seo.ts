import { Router } from 'express';
import { db } from '../db/db';
import { products, users, categories } from '../db/schema';
import { eq, like } from 'drizzle-orm';

const router = Router();

router.get(["/seo/category/:slug", "/api/seo/category/:slug", "/api-v2/seo/category/:slug"], async (req, res) => {
  try {
    const { slug } = req.params;
    const categoryName = slug.replace(/-/g, ' ');
    
    const categoryProducts = await db.query.products.findMany({
      where: like(products.title, `%${categoryName}%`),
      limit: 20,
      with: {
        seller: true
      }
    });

    res.json({
      categoryName,
      slug,
      products: categoryProducts
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
