import express from "express";
import { getStripe, getEasyPost, resend, generateEmbedding, ai } from "../lib/services.js";

import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, feedback, leads, affiliates, marketing_logs, categories, inquiries, inquiryMessages, reviews, orders, orderItems } from "../db/schema.js";
import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin, requireSeller } from "../middleware/roles.js";
import crypto from "crypto";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
import { getUserProfile } from "../db/users.js";
import { getTranslatedProduct } from "../lib/translate.js";
import { PRODUCT_LANGUAGES, SEALED_TYPES } from "../lib/productTaxonomy.js";
import { ensureSealedTaxonomySchema } from "../db/index.js";

const router = Router();

router.get("/api-v2/countries", async (req, res) => {
  try {
    const sellersWithProducts = await db.selectDistinct({ 
      country: users.country,
      region: users.region
    })
    .from(products)
    .innerJoin(users, eq(products.sellerId, users.id))
    .where(and(isNotNull(users.country), eq(products.approvalStatus, 'approved')));
    const countries = Array.from(new Set(sellersWithProducts.map(s => s.country).filter(Boolean))).sort();
    const regions = Array.from(new Set(sellersWithProducts.map(s => s.region).filter(Boolean))).sort();
    res.json({ countries, regions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Facets for the marketplace sidebar: languages, sealed product types and
 * seller countries, each with the number of approved sealed listings.
 * Only facets that actually have products are returned, so the sidebar never
 * shows empty options.
 */
router.get("/api-v2/marketplace/facets", async (req, res) => {
  try {
    await ensureSealedTaxonomySchema();
    
    // Build dynamic conditions based on query params
    const conditions = [eq(products.approvalStatus, 'approved'), sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`];
    
    const categoryId = req.query.category;
    if (categoryId) {
       const parsedId = parseInt(String(categoryId), 10);
       const catIds = await getDescendantCategoryIds(db, parsedId);
       conditions.push(or(inArray(products.categoryId, catIds), sql`${products.categoryIds} && ARRAY[${sql.join(catIds.map(id => sql`${id}`), sql`, `)}]::int[]`));
    }

    const minMoq = req.query.minMoq;
    const maxPrice = req.query.maxPrice;
    if (maxPrice) conditions.push(sql`CAST(${products.unitCost} AS numeric) <= ${parseFloat(String(maxPrice))}`);
    if (minMoq) conditions.push(sql`${products.moq} <= ${parseInt(String(minMoq))}`);

    const q = req.query.q;
    if (q) {
      const qStr = String(q);
      conditions.push(or(ilike(products.title, `%${qStr}%`), ilike(products.description, `%${qStr}%`)));
    }

    // When calculating facets, we usually want to know how many WOULD match if we selected it.
    // We'll apply cross-filtering: filter languages by everything EXCEPT language, etc.
    const languagesParam = (req.query.languages) || (req.query.language) || '';
    const sealedTypesParam = (req.query.sealedTypes) || (req.query.sealedType) || '';
    const countriesParam = (req.query.countries) || (req.query.includeCountries) || '';
    
    const langConds = [...conditions];
    const typeConds = [...conditions];
    const countryConds = [...conditions];
    
    if (sealedTypesParam) {
       const arr = String(sealedTypesParam).split(',').filter(Boolean);
       if (arr.length > 0) { langConds.push(inArray(products.sealedType, arr)); countryConds.push(inArray(products.sealedType, arr)); }
    }
    if (languagesParam) {
       const arr = String(languagesParam).split(',').filter(Boolean);
       if (arr.length > 0) { typeConds.push(inArray(products.language, arr)); countryConds.push(inArray(products.language, arr)); }
    }
    if (countriesParam) {
       const arr = String(countriesParam).split(',').filter(Boolean);
       if (arr.length > 0) { langConds.push(inArray(users.country, arr)); typeConds.push(inArray(users.country, arr)); }
    }

    const [langRows, typeRows, countryRows] = await Promise.all([
      db.select({ key: products.language, count: sql<number>`count(*)::int` })
        .from(products).leftJoin(users, eq(products.sellerId, users.id)).where(and(...langConds)).groupBy(products.language),
      db.select({ key: products.sealedType, count: sql<number>`count(*)::int` })
        .from(products).leftJoin(users, eq(products.sellerId, users.id)).where(and(...typeConds)).groupBy(products.sealedType),
      db.select({ key: users.country, count: sql<number>`count(*)::int` })
        .from(products).innerJoin(users, eq(products.sellerId, users.id)).where(and(...countryConds, isNotNull(users.country))).groupBy(users.country),
    ]);

    const langMap = new Map<string, number>(langRows.map(r => [r.key || 'unset', Number(r.count)] as const));
    const typeMap = new Map<string, number>(typeRows.map(r => [r.key || 'unset', Number(r.count)] as const));

    const languages = PRODUCT_LANGUAGES
      .map(l => ({ ...l, count: langMap.get(l.value) || 0 }))
      .filter(l => (l.count ?? 0) > 0);
    const sealedTypes = SEALED_TYPES
      .map(s => ({ ...s, count: typeMap.get(s.value) || 0 }))
      .filter(s => (s.count ?? 0) > 0);
    const countries = countryRows
      .filter(r => r.key)
      .map(r => ({ value: r.key as string, count: Number(r.count) }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    res.json({
      languages,
      sealedTypes,
      countries,
      unclassified: { language: langMap.get('unset') || 0, sealedType: typeMap.get('unset') || 0 }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function getDescendantCategoryIds(db: any, parentId: number): Promise<number[]> {
  const allCats = await db.select().from(categories);
  const ids = new Set<number>();
  ids.add(parentId);
  let added = true;
  while (added) {
    added = false;
    for (const cat of allCats) {
      if (cat.parentId && ids.has(cat.parentId) && !ids.has(cat.id)) {
        ids.add(cat.id);
        added = true;
      }
    }
  }
  return Array.from(ids);
}

router.get("/api-v2/products", async (req: AuthRequest, res) => {
    try {
      await ensureSealedTaxonomySchema();
      const q = req.query.q as string;
      const origin = req.query.origin as string;
      const minMoq = req.query.minMoq as string;
      const maxPrice = req.query.maxPrice as string;
      const categoryId = req.query.category as string;
      const productType = req.query.productType as string;
      const sortBy = req.query.sortBy as string || 'newest';
      const languagesParam = (req.query.languages as string) || (req.query.language as string) || '';
      const sealedTypesParam = (req.query.sealedTypes as string) || (req.query.sealedType as string) || '';
      const countriesParam = (req.query.countries as string) || (req.query.includeCountries as string) || '';
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = 12;
      const offset = (page - 1) * limit;

      let query = db.select({
        product: {
          id: products.id,
          sellerId: products.sellerId,
          categoryId: products.categoryId,
          categoryIds: products.categoryIds,
          isSponsored: products.isSponsored,
          title: products.title,
          brand: products.brand,
          description: products.description,
          specifications: products.specifications,
          moq: products.moq,
          oemMoq: products.oemMoq,
          stockQuantity: products.stockQuantity,
          unitCost: products.unitCost,
          tieredPricing: products.tieredPricing,
          originType: products.originType,
          leadTimeDays: products.leadTimeDays,
          shippingOptions: products.shippingOptions,
          images: products.images,
          productType: products.productType,
          language: products.language,
          sealedType: products.sealedType,
          gradingCompany: products.gradingCompany,
          grade: products.grade,
          certNumber: products.certNumber,
          cardYear: products.cardYear,
          cardSet: products.cardSet,
          cardNumber: products.cardNumber,
          cardVariant: products.cardVariant,
          createdAt: products.createdAt,
          category: categories.name
        },
        seller: { id: users.id, companyName: users.companyName, country: users.country }
      }).from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));
      
      let countQuery = db.select({ count: sql`count(*)` }).from(products).leftJoin(users, eq(products.sellerId, users.id));

      const conditions = [eq(products.approvalStatus, 'approved'), (productType === 'graded' ? eq(products.productType, 'graded') : sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`)];
      
      const excludeCountries = req.query.excludeCountries as string;
      const includeRegions = req.query.includeRegions as string;
      const excludeRegions = req.query.excludeRegions as string;

      if (languagesParam) {
         const arr = languagesParam.split(',').filter(Boolean);
         if (arr.length > 0) conditions.push(inArray(products.language, arr));
      }
      if (sealedTypesParam) {
         const arr = sealedTypesParam.split(',').filter(Boolean);
         if (arr.length > 0) conditions.push(inArray(products.sealedType, arr));
      }
      if (countriesParam) {
         const arr = countriesParam.split(',').filter(Boolean);
         if (arr.length > 0) conditions.push(inArray(users.country, arr));
      }
      if (excludeCountries) {
         const arr = excludeCountries.split(',').filter(Boolean);
         if (arr.length > 0) conditions.push(not(inArray(users.country, arr)));
      }
      if (includeRegions) {
         const arr = includeRegions.split(',').filter(Boolean);
         if (arr.length > 0) conditions.push(inArray(users.region, arr));
      }
      if (excludeRegions) {
         const arr = excludeRegions.split(',').filter(Boolean);
         if (arr.length > 0) conditions.push(not(inArray(users.region, arr)));
      }
      
      if (categoryId) {
         const parsedId = parseInt(categoryId, 10);
         const catIds = await getDescendantCategoryIds(db, parsedId);
         conditions.push(or(inArray(products.categoryId, catIds), sql`${products.categoryIds} && ARRAY[${sql.join(catIds.map(id => sql`${id}`), sql`, `)}]::int[]`));
      }

      
      if (maxPrice) {
         conditions.push(sql`CAST(${products.unitCost} AS numeric) <= ${parseFloat(maxPrice)}`);
      }

      if (minMoq) {
         const moqVal = parseInt(minMoq);
         conditions.push(sql`${products.moq} <= ${moqVal}`);
      }

      let textSearchFailed = false;
      if (q) {
        try {
           const queryEmbedding = await generateEmbedding(q);
           if (queryEmbedding) {
              const vectorString = '[' + queryEmbedding.join(',') + ']';
              query = query.orderBy(sql`${products.embedding} <-> ${vectorString}`) as any;
           } else {
             textSearchFailed = true;
           }
        } catch(e) {
           textSearchFailed = true;
        }
      }
      
      if (textSearchFailed) {
         conditions.push(or(
           ilike(products.title, `%${q}%`),
           ilike(products.description, `%${q}%`)
         ) as any);
      }
      
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
      
      if (!q || textSearchFailed) {
         if (sortBy === 'recommended') {
           query = query.orderBy(desc(products.isSponsored), sql`RANDOM()`) as any;
         } else if (sortBy === 'randomized') {
           query = query.orderBy(sql`RANDOM()`) as any;
         } else if (sortBy === 'lowest_moq' || sortBy === 'moq_asc') {
           query = query.orderBy(products.moq) as any;
         } else if (sortBy === 'company_az') {
           query = query.orderBy(sql`LOWER(COALESCE(${users.companyName}, '')) ASC`, asc(products.title)) as any;
         } else if (sortBy === 'company_za') {
           query = query.orderBy(sql`LOWER(COALESCE(${users.companyName}, '')) DESC`, asc(products.title)) as any;
         } else if (sortBy === 'lowest_price' || sortBy === 'price_asc') {
           query = query.orderBy(sql`CAST(${products.unitCost} AS numeric) ASC`) as any;
         } else if (sortBy === 'highest_price' || sortBy === 'price_desc') {
           query = query.orderBy(sql`CAST(${products.unitCost} AS numeric) DESC`) as any;
         } else {
           query = query.orderBy(desc(products.createdAt)) as any;
         }
      }
      
      query = query.limit(limit).offset(offset) as any;
      
      const [allProducts, [{ count }]] = await Promise.all([
        query,
        countQuery
      ]);
      
      res.json({
        products: allProducts.map((p: any) => ({ ...p.product, seller: p.seller })),
        totalPages: Math.ceil(Number(count) / limit),
        currentPage: page
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });


router.get('/api-v2/products/:id/reviews', async (req, res) => {
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

router.post('/api-v2/products/:id/reviews', requireAuth, async (req: any, res) => {
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

router.post('/api-v2/checkout/session', requireAuth, async (req: any, res) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).json({ error: 'User not found' });

    // Calculate total amount and verify products
    let totalAmount = 0;
    const validatedItems: any[] = [];
    const productIds = items.map((i: any) => i.productId);
    
    const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));
    const productMap = new Map<number, (typeof dbProducts)[number]>(dbProducts.map(p => [p.id, p] as const));

    let sellerId: number | null = null;

    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) return res.status(404).json({ error: `Product ${item.productId} not found` });

      if (sellerId === null) {
        sellerId = dbProduct.sellerId;
      } else if (sellerId !== dbProduct.sellerId) {
        return res.status(400).json({ error: 'All items must be from the same seller' });
      }

      // use a unit price
      const unitPrice = parseFloat(dbProduct.unitCost?.toString() || '0');
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        productId: item.productId,
        title: dbProduct.title,
        quantity: item.quantity,
        unitPrice: unitPrice
      });
    }

    // Create Order
    const [order] = await db.insert(orders).values({
      buyerId: userProfile.id,
      sellerId: sellerId as number,
      totalAmount: totalAmount.toString(),
      status: 'pending'
    }).returning();

    // Create Order Items
    for (const vItem of validatedItems) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: vItem.productId,
        quantity: vItem.quantity,
        unitPrice: vItem.unitPrice.toString()
      });
    }

    // Create Stripe Session
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Fetch seller stripe account
    const sellerInfo = await db.select({ stripeAccountId: users.stripeAccountId, stripeOnboardingComplete: users.stripeOnboardingComplete }).from(users).where(eq(users.id, sellerId as number)).limit(1);
    if (!sellerInfo.length || !sellerInfo[0].stripeAccountId || !sellerInfo[0].stripeOnboardingComplete) {
        return res.status(400).json({ error: "The seller is not fully onboarded with Stripe to receive payments yet." });
    }

    const platformFeeCents = Math.round((totalAmount * 100) * 0.045) + 30; // 4.5% + 30c total fee

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: sellerInfo[0].stripeAccountId,
        },
      },
      line_items: validatedItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title,
          },
          unit_amount: Math.round(item.unitPrice * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/orders?success=true`,
      cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/cart?canceled=true`,
      metadata: {
        orderId: order.id.toString(),
      },
    });

    await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id));

    res.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api-v2/orders', requireAuth, async (req: any, res) => {
  try {
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).json({ error: 'User not found' });
    
    const myOrders = await db.select().from(orders).where(eq(orders.buyerId, userProfile.id)).orderBy(desc(orders.createdAt));
    res.json(myOrders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;