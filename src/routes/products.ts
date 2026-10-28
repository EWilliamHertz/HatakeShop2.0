import express from "express";
import { getStripe, getEasyPost, resend, generateEmbedding, ai } from "../lib/services.js";

import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, feedback, leads, affiliates, marketing_logs, categories, inquiries, inquiryMessages, reviews, orders, orderItems } from "../db/schema.js";
import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc } from "drizzle-orm";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin, requireSeller } from "../middleware/roles.js";
import crypto from "crypto";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
import { getUserProfile, getOrCreateUser } from "../db/users.js";
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
function buildProductSearchCondition(qRaw: string) {
  const qStr = qRaw.trim();
  const pattern = `%${qStr}%`;
  return sql`(
    ${products.title} ILIKE ${pattern}
    OR COALESCE(${products.brand}, '') ILIKE ${pattern}
    OR COALESCE(${products.description}, '') ILIKE ${pattern}
    OR COALESCE(${products.specifications}::text, '') ILIKE ${pattern}
    OR COALESCE(${users.companyName}, '') ILIKE ${pattern}
    OR websearch_to_tsquery('simple', ${qStr}) @@ to_tsvector('simple', coalesce(${products.title},'') || ' ' || coalesce(${products.brand},'') || ' ' || coalesce(${products.description},''))
  )`;
}

router.get("/api-v2/marketplace/facets", async (req, res) => {
  try {
    await ensureSealedTaxonomySchema();
    const productType = String(req.query.productType || 'all');
    const typeCondition = productType === 'all'
      ? sql`TRUE`
      : productType === 'graded'
        ? eq(products.productType, 'graded')
        : productType === 'oem'
          ? eq(products.offersOem, true)
          : productType === 'sealed'
            ? and(sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`, eq(products.offersOem, false))
            : sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`;

    // Build dynamic conditions based on query params
    const conditions: any[] = [eq(products.approvalStatus, 'approved'), typeCondition];

    const categoryId = req.query.category;
    if (categoryId) {
      const parsedId = parseInt(String(categoryId), 10);
      if (!Number.isNaN(parsedId)) {
        const catIds = await getDescendantCategoryIds(db, parsedId);
        conditions.push(or(inArray(products.categoryId, catIds), sql`${products.categoryIds} && ARRAY[${sql.join(catIds.map(id => sql`${id}`), sql`, `)}]::int[]`));
      }
    }

    const sellerIdParam = req.query.seller || req.query.sellerId;
    if (sellerIdParam) {
      const parsedSeller = parseInt(String(sellerIdParam), 10);
      if (!Number.isNaN(parsedSeller)) conditions.push(eq(products.sellerId, parsedSeller));
    }

    const oemOnly = req.query.oem === 'true' || req.query.oem === '1' || req.query.offersOem === 'true';

    const minMoq = req.query.minMoq;
    const maxPrice = req.query.maxPrice;
    if (maxPrice) conditions.push(sql`CAST(${products.unitCost} AS numeric) <= ${parseFloat(String(maxPrice))}`);
    if (minMoq) conditions.push(sql`${products.moq} <= ${parseInt(String(minMoq))}`);

    const q = req.query.q;
    if (q && String(q).trim()) {
      conditions.push(buildProductSearchCondition(String(q)));
    }

    const baseWithOem = oemOnly ? [...conditions, eq(products.offersOem, true)] : [...conditions];

    // Cross-filtering: filter languages by everything EXCEPT language, etc.
    const languagesParam = (req.query.languages) || (req.query.language) || '';
    const sealedTypesParam = (req.query.sealedTypes) || (req.query.sealedType) || '';
    const countriesParam = (req.query.countries) || (req.query.includeCountries) || '';

    const langConds = [...baseWithOem];
    const typeConds = [...baseWithOem];
    const countryConds = [...baseWithOem];
    const oemConds = [...conditions];

    if (sealedTypesParam) {
      const arr = String(sealedTypesParam).split(',').filter(Boolean);
      if (arr.length > 0) {
        langConds.push(inArray(products.sealedType, arr));
        countryConds.push(inArray(products.sealedType, arr));
        oemConds.push(inArray(products.sealedType, arr));
      }
    }
    if (languagesParam) {
      const arr = String(languagesParam).split(',').filter(Boolean);
      if (arr.length > 0) {
        typeConds.push(inArray(products.language, arr));
        countryConds.push(inArray(products.language, arr));
        oemConds.push(inArray(products.language, arr));
      }
    }
    if (countriesParam) {
      const arr = String(countriesParam).split(',').filter(Boolean);
      if (arr.length > 0) {
        langConds.push(inArray(users.country, arr));
        typeConds.push(inArray(users.country, arr));
        oemConds.push(inArray(users.country, arr));
      }
    }

    const [langRows, typeRows, countryRows, sellerRows, oemStats] = await Promise.all([
      db.select({ key: products.language, count: sql<number>`count(*)::int` })
        .from(products).leftJoin(users, eq(products.sellerId, users.id)).where(and(...langConds)).groupBy(products.language),
      db.select({ key: products.sealedType, count: sql<number>`count(*)::int` })
        .from(products).leftJoin(users, eq(products.sellerId, users.id)).where(and(...typeConds)).groupBy(products.sealedType),
      db.select({ key: users.country, count: sql<number>`count(*)::int` })
        .from(products).innerJoin(users, eq(products.sellerId, users.id)).where(and(...countryConds, isNotNull(users.country))).groupBy(users.country),
      db.select({
        id: users.id,
        companyName: users.companyName,
        country: users.country,
        verificationStatus: users.verificationStatus,
        count: sql<number>`count(*)::int`
      })
        .from(products).innerJoin(users, eq(products.sellerId, users.id)).where(and(...baseWithOem))
        .groupBy(users.id, users.companyName, users.country, users.verificationStatus),
      db.select({
        total: sql<number>`count(*)::int`,
        oemCount: sql<number>`count(*) filter (where ${products.offersOem} = true)::int`
      })
        .from(products).leftJoin(users, eq(products.sellerId, users.id)).where(and(...oemConds)),
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
    const sellers = sellerRows
      .map(s => ({
        id: s.id,
        companyName: s.companyName || 'Supplier',
        country: s.country || null,
        verificationStatus: s.verificationStatus || null,
        count: Number(s.count),
      }))
      .sort((a, b) => b.count - a.count || a.companyName.localeCompare(b.companyName));

    res.json({
      languages,
      sealedTypes,
      countries,
      sellers,
      totalProducts: Number(oemStats[0]?.total || 0),
      oemCount: Number(oemStats[0]?.oemCount || 0),
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
      const productType = (req.query.productType as string) || 'all';
      const sortBy = req.query.sortBy as string || 'newest';
      const languagesParam = (req.query.languages as string) || (req.query.language as string) || '';
      const sealedTypesParam = (req.query.sealedTypes as string) || (req.query.sealedType as string) || '';
      const countriesParam = (req.query.countries as string) || (req.query.includeCountries as string) || '';
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12; if (limit > 200) return res.status(400).json({error: "Limit too high"});
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
          offersOem: products.offersOem,
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
        seller: {
          id: users.id,
          companyName: users.companyName,
          country: users.country,
          verificationStatus: users.verificationStatus,
          supplierTier: users.supplierTier,
        }
      }).from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));
      
      let countQuery = db.select({ count: sql`count(*)` }).from(products).leftJoin(users, eq(products.sellerId, users.id));

      const typeClause = productType === 'all'
        ? sql`TRUE`
        : productType === 'graded'
          ? eq(products.productType, 'graded')
          : productType === 'oem'
            ? eq(products.offersOem, true)
            : productType === 'sealed'
              ? and(sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`, eq(products.offersOem, false))
              : sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`;
      const conditions: any[] = [eq(products.approvalStatus, 'approved'), typeClause];

      const idsParam = req.query.ids as string;
      if (idsParam) {
        const parsedIds = idsParam.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !Number.isNaN(n));
        if (parsedIds.length > 0) conditions.push(inArray(products.id, parsedIds));
      }

      const sellerIdParam = (req.query.seller as string) || (req.query.sellerId as string);
      if (sellerIdParam) {
        const parsedSeller = parseInt(sellerIdParam, 10);
        if (!Number.isNaN(parsedSeller)) conditions.push(eq(products.sellerId, parsedSeller));
      }

      const oemOnly = req.query.oem === 'true' || req.query.oem === '1' || req.query.offersOem === 'true';
      if (oemOnly) {
        conditions.push(eq(products.offersOem, true));
      }
      
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

      const qTrimmed = String(q || '').trim();
      if (qTrimmed) {
        conditions.push(buildProductSearchCondition(qTrimmed));
      }

      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;

      if (qTrimmed && (!req.query.sortBy || sortBy === 'newest' || sortBy === 'recommended')) {
        const titlePrefix = `${qTrimmed}%`;
        const titleSub = `%${qTrimmed}%`;
        query = query.orderBy(
          sql`CASE WHEN ${products.title} ILIKE ${titlePrefix} THEN 0 WHEN ${products.title} ILIKE ${titleSub} THEN 1 ELSE 2 END`,
          desc(products.isSponsored),
          desc(products.createdAt)
        ) as any;
      } else if (sortBy === 'recommended') {
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
        query = query.orderBy(sql`CAST(${products.unitCost} AS numeric) ASC NULLS LAST`) as any;
      } else if (sortBy === 'highest_price' || sortBy === 'price_desc') {
        query = query.orderBy(sql`CAST(${products.unitCost} AS numeric) DESC NULLS LAST`) as any;
      } else {
        query = query.orderBy(desc(products.createdAt)) as any;
      }

      query = query.limit(limit).offset(offset) as any;

      const [allProducts, [{ count }]] = await Promise.all([
        query,
        countQuery
      ]);

      res.json({
        products: allProducts.map((p: any) => ({ ...p.product, seller: p.seller })),
        totalCount: Number(count),
        totalPages: Math.max(1, Math.ceil(Number(count) / limit)),
        currentPage: page
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/products/public", async (req, res) => {
  try {
    const qStr = String(req.query.q || '').trim();
    const limit = Math.min(24, Math.max(1, parseInt(String(req.query.limit || '8'), 10) || 8));
    if (!qStr) return res.json({ products: [] });
    const titlePrefix = `${qStr}%`;
    const rows = await db.select({
      product: {
        id: products.id,
        sellerId: products.sellerId,
        title: products.title,
        brand: products.brand,
        description: products.description,
        specifications: products.specifications,
        moq: products.moq,
        oemMoq: products.oemMoq,
        offersOem: products.offersOem,
        unitCost: products.unitCost,
        tieredPricing: products.tieredPricing,
        originType: products.originType,
        images: products.images,
        language: products.language,
        sealedType: products.sealedType,
        category: categories.name,
      },
      seller: {
        id: users.id,
        companyName: users.companyName,
        country: users.country,
        verificationStatus: users.verificationStatus,
      }
    })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.approvalStatus, 'approved'), buildProductSearchCondition(qStr)))
      .orderBy(sql`CASE WHEN ${products.title} ILIKE ${titlePrefix} THEN 0 ELSE 1 END`, desc(products.createdAt))
      .limit(limit);

    res.json({ products: rows.map((r: any) => ({ ...r.product, seller: r.seller })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message, products: [] });
  }
});



router.get("/api-v2/products/:id", async (req, res) => {
  try {
    const pId = parseInt(req.params.id, 10);
    const data = await db.select({ product: products, seller: { companyName: users.companyName, id: users.id } })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, pId));
      
    if (!data.length) return res.status(404).json({ error: "Product not found" });
    res.json({ ...data[0].product, seller: data[0].seller });
  } catch(e) {
    res.status(500).json({ error: e.message });
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

router.post('/api-v2/checkout/session', optionalAuth, async (req: any, res) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    let userProfile = null;
    if (req.user?.uid) {
      userProfile = (await getUserProfile(req.user.uid)) || (await getOrCreateUser(req.user.uid, req.user.email || '', req.user.name));
    }
    if (!userProfile) {
      userProfile = await getOrCreateUser('guest_customer', 'guest@hatake.shop', 'Guest Customer');
    }

    // Calculate total amount and verify products
    let totalAmount = 0;
    const validatedItems: any[] = [];
    const productIds = items.map((i: any) => i.productId);
    
    const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));
    const productMap = new Map<number, (typeof dbProducts)[number]>(dbProducts.map(p => [p.id, p] as const));

    let sellerId: number | null = null;
    let isSverigeOrder = false;

    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) return res.status(404).json({ error: `Product ${item.productId} not found` });

      if (sellerId === null) {
        sellerId = dbProduct.sellerId;
      } else if (sellerId !== dbProduct.sellerId) {
        return res.status(400).json({ error: 'All items must be from the same seller' });
      }

      if (dbProduct.isSverigeB2c) {
        isSverigeOrder = true;
      }

      const rawPrice = dbProduct.isSverigeB2c && dbProduct.sverigePrice ? dbProduct.sverigePrice : dbProduct.unitCost;
      const unitPrice = parseFloat(rawPrice?.toString() || '0');
      const itemTotal = unitPrice * (item.quantity || 1);
      totalAmount += itemTotal;

      validatedItems.push({
        productId: item.productId,
        title: (dbProduct.isSverigeB2c && dbProduct.sverigeTitle ? dbProduct.sverigeTitle : dbProduct.title),
        quantity: item.quantity || 1,
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

    // Determine currency: SEK for Sweden shop, EUR for wholesale
    const currency = isSverigeOrder ? 'sek' : 'eur';

    // Shipping options: Standard & Express with explicit shipping fees
    const shippingOptions = isSverigeOrder ? [
      {
        shipping_rate_data: {
          type: 'fixed_amount' as const,
          fixed_amount: {
            amount: 4900, // 49.00 SEK
            currency: 'sek',
          },
          display_name: 'Standardfrakt PostNord / DHL (Sverige)',
          delivery_estimate: {
            minimum: { unit: 'business_day' as const, value: 2 },
            maximum: { unit: 'business_day' as const, value: 4 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: 'fixed_amount' as const,
          fixed_amount: {
            amount: 8900, // 89.00 SEK
            currency: 'sek',
          },
          display_name: 'Expressfrakt (1-2 vardagar)',
          delivery_estimate: {
            minimum: { unit: 'business_day' as const, value: 1 },
            maximum: { unit: 'business_day' as const, value: 2 },
          },
        },
      }
    ] : [
      {
        shipping_rate_data: {
          type: 'fixed_amount' as const,
          fixed_amount: {
            amount: 1500, // €15.00
            currency: 'eur',
          },
          display_name: 'Standard Freight Shipping (EU & International)',
          delivery_estimate: {
            minimum: { unit: 'business_day' as const, value: 3 },
            maximum: { unit: 'business_day' as const, value: 7 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: 'fixed_amount' as const,
          fixed_amount: {
            amount: 3500, // €35.00
            currency: 'eur',
          },
          display_name: 'Express Priority Freight (1-3 days)',
          delivery_estimate: {
            minimum: { unit: 'business_day' as const, value: 1 },
            maximum: { unit: 'business_day' as const, value: 3 },
          },
        },
      }
    ];

    // Allowed shipping destination countries
    const allowedShippingCountries = [
      'SE', 'NO', 'DK', 'FI', 'DE', 'FR', 'NL', 'BE', 'AT', 'CH',
      'PL', 'IT', 'ES', 'PT', 'IE', 'CZ', 'EE', 'LV', 'LT', 'GB',
      'US', 'CA', 'JP', 'AU'
    ];

    const baseUrl = req.headers.origin || process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:5173';

    const sessionParams: any = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: validatedItems.map(item => ({
        price_data: {
          currency: currency,
          product_data: {
            name: item.title,
          },
          unit_amount: Math.round(item.unitPrice * 100), // Stripe expects cents / öre
        },
        quantity: item.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: allowedShippingCountries,
      },
      shipping_options: shippingOptions,
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/orders?success=true&order_id=${order.id}`,
      cancel_url: `${baseUrl}/${isSverigeOrder ? 'sweden' : 'cart'}?canceled=true`,
      metadata: {
        orderId: order.id.toString(),
        isSverige: isSverigeOrder ? 'true' : 'false',
        buyerId: userProfile.id.toString(),
      },
    };

    // If customer email is known, prefill it in Stripe Checkout
    if (userProfile.email && userProfile.email !== 'guest@hatake.shop') {
      sessionParams.customer_email = userProfile.email;
    }

    // Connect transfer if seller has an active connected Stripe account; otherwise payments collect directly to platform
    if (sellerId) {
      const sellerInfo = await db.select({ stripeAccountId: users.stripeAccountId, stripeOnboardingComplete: users.stripeOnboardingComplete }).from(users).where(eq(users.id, sellerId as number)).limit(1);
      if (sellerInfo.length && sellerInfo[0].stripeAccountId && sellerInfo[0].stripeOnboardingComplete) {
        const totalCents = Math.round(totalAmount * 100);
        let platformFeeCents = Math.round(totalCents * 0.045) + 30; // 4.5% + 30c
        if (platformFeeCents >= totalCents) {
          platformFeeCents = Math.max(0, totalCents - 100);
        }
        sessionParams.payment_intent_data = {
          application_fee_amount: platformFeeCents,
          transfer_data: {
            destination: sellerInfo[0].stripeAccountId,
          },
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id));

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout session error:', err);
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


router.get("/api-v2/sverige-products", async (req, res) => {
  try {
    const p = await db.select().from(products).where(eq(products.isSverigeB2c, true));
    // Also fetch seller info for these products
    const s = await db.select().from(users);
    const sellerMap = Object.fromEntries(s.map(x => [x.id, x]));
    
    res.json(p.map(prod => ({
       ...prod,
       seller: sellerMap[prod.sellerId] || {}
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;