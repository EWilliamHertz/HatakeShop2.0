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

const router = Router();

router.get("/api-v2/products", async (req: AuthRequest, res) => {
    try {
      const q = req.query.q as string;
      const origin = req.query.origin as string;
      const minMoq = req.query.minMoq as string;
      const maxPrice = req.query.maxPrice as string;
      const categoryId = req.query.category as string;
      const productType = req.query.productType as string;
      const sortBy = req.query.sortBy as string || 'newest';
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = 12;
      const offset = (page - 1) * limit;

      let query = db.select({
        product: {
          id: products.id,
          sellerId: products.sellerId,
          categoryId: products.categoryId,
          title: products.title,
          brand: products.brand,
          description: products.description,
          specifications: products.specifications,
          moq: products.moq,
          stockQuantity: products.stockQuantity,
          unitCost: products.unitCost,
          tieredPricing: products.tieredPricing,
          originType: products.originType,
          leadTimeDays: products.leadTimeDays,
          shippingOptions: products.shippingOptions,
          images: products.images,
          productType: products.productType,
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
      
      let countQuery = db.select({ count: sql`count(*)` }).from(products);

      const conditions = [eq(products.approvalStatus, 'approved'), (productType === 'graded' ? eq(products.productType, 'graded') : sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`)];
      
      if (origin) {
         conditions.push(eq(products.originType, origin));
      }
      
      if (categoryId) {
         const parsedId = parseInt(categoryId, 10);
         const catIds = await getDescendantCategoryIds(db, parsedId);
         conditions.push(inArray(products.categoryId, catIds));
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
         if (sortBy === 'randomized') {
           query = query.orderBy(sql`RANDOM()`) as any;
         } else if (sortBy === 'lowest_moq') {
           query = query.orderBy(products.moq) as any;
         } else if (sortBy === 'lowest_price') {
           query = query.orderBy(sql`CAST(${products.unitCost} AS numeric) ASC`) as any;
         } else if (sortBy === 'highest_price') {
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
    const validatedItems = [];
    const productIds = items.map((i: any) => i.productId);
    
    const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    let sellerId = null;

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
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