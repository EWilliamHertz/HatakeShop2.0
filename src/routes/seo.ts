import { Router, Request } from 'express';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { eq, like, and } from 'drizzle-orm';

const router = Router();

function getSiteMeta(req: Request) {
  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || req.hostname || 'hatake.shop')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const isB2b =
    rawHost.startsWith('b2b.') ||
    rawHost.endsWith(':3001') ||
    req.query?.site === 'b2b' ||
    req.path === '/b2b' ||
    req.path.startsWith('/b2b/');
  const isLocal = rawHost.includes('localhost') || rawHost.startsWith('127.0.0.1');
  const proto = String(req.headers['x-forwarded-proto'] || (isLocal ? 'http' : 'https')).split(',')[0].trim();
  const canonicalBase = isLocal
    ? `${proto}://${rawHost}`
    : isB2b
      ? 'https://b2b.hatake.shop'
      : 'https://hatake.shop';

  return {
    isB2b,
    siteMode: isB2b ? 'b2b' : 'b2c',
    canonicalBase,
    brand: isB2b ? 'B2B.Hatake.Shop' : 'Hatake.Shop',
    defaultLang: 'sv',
    alternates: {
      'sv-SE': canonicalBase,
      en: `${canonicalBase}/?lang=en`,
    },
  };
}

router.get(['/seo/meta', '/api/seo/meta', '/api-v2/seo/meta'], (req, res) => {
  const meta = getSiteMeta(req);
  res.json(meta);
});

router.get(['/seo/category/:slug', '/api/seo/category/:slug', '/api-v2/seo/category/:slug'], async (req, res) => {
  try {
    const { slug } = req.params;
    const categoryName = slug.replace(/-/g, ' ');
    const siteMeta = getSiteMeta(req);

    const categoryProducts = await db.query.products.findMany({
      where: siteMeta.isB2b
        ? like(products.title, `%${categoryName}%`)
        : and(eq(products.isSverigeB2c, true), like(products.title, `%${categoryName}%`)),
      limit: 20,
      with: {
        seller: true,
      },
    });

    res.json({
      categoryName,
      slug,
      siteMode: siteMeta.siteMode,
      canonicalUrl: `${siteMeta.canonicalBase}/wholesale/${slug}`,
      alternates: {
        'sv-SE': `${siteMeta.canonicalBase}/wholesale/${slug}`,
        en: `${siteMeta.canonicalBase}/wholesale/${slug}?lang=en`,
      },
      products: categoryProducts,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
