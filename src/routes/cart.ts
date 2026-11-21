import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { inquiries, inquiryMessages, products, users, notifications } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { adminDb } from '../lib/firebase-admin.js';
import { getUserProfile } from '../db/users.js';

const router = Router();

router.post(['/cart/rfq', '/api/cart/rfq', '/api-v2/cart/rfq'], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).json({ error: 'User profile missing' });

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty cart items' });
    }

    const createdInquiries = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Math.max(1, Number(item.quantity) || 1);

      const productInfo = productId
        ? await db
            .select({
              sellerId: products.sellerId,
              sellerUid: users.uid,
              sellerEmail: users.email,
              productTitle: products.title,
              unitCost: products.unitCost,
            })
            .from(products)
            .leftJoin(users, eq(products.sellerId, users.id))
            .where(eq(products.id, productId))
            .limit(1)
        : [];

      const resolvedSellerId =
        Number(item.sellerId ?? item.supplierId ?? productInfo[0]?.sellerId ?? 0) || null;
      const unitCostNum = Number(item.unitCost ?? productInfo[0]?.unitCost ?? 0);
      const targetBudget = unitCostNum > 0 ? (unitCostNum * quantity).toFixed(2) : null;

      const result = await db
        .insert(inquiries)
        .values({
          buyerId: userProfile.id,
          targetProductId: productId || null,
          targetSellerId: resolvedSellerId,
          quantity,
          targetBudget,
          status: 'Pending',
          aiNotes: 'Auto-generated from Multi-Vendor Cart RFQ checkout.',
        })
        .returning();

      const newInquiry = result[0];
      createdInquiries.push(newInquiry);

      const productTitle = productInfo[0]?.productTitle || item.title || `Product #${productId}`;

      await db.insert(inquiryMessages).values({
        inquiryId: newInquiry.id,
        senderId: userProfile.id,
        messageContent: `Requested bulk quote for ${quantity} units of ${productTitle}.`,
        isOfficialQuote: false,
      });

      if (resolvedSellerId) {
        try {
          await db.insert(notifications).values({
            userId: resolvedSellerId,
            title: 'New Bulk RFQ Inquiry',
            message: `${userProfile.companyName || userProfile.displayName || userProfile.email} requested a quote for ${productTitle} (${quantity} pcs).`,
            link: `/rfq/${newInquiry.id}`,
          });
        } catch {}
      }

      if (productInfo.length > 0) {
        try {
          await adminDb
            .collection('inquiries')
            .doc(newInquiry.id.toString())
            .set({
              id: newInquiry.id,
              buyerId: userProfile.id,
              targetProductId: productId,
              targetSellerId: resolvedSellerId,
              productTitle,
              quantity,
              status: 'Pending',
              createdAt: new Date().toISOString(),
              lastMessageAt: new Date().toISOString(),
              unreadCountBuyer: 0,
              unreadCountSeller: 1,
            });
        } catch (fsErr) {
          console.warn('Firestore inquiry sync non-fatal warning:', fsErr);
        }
      }
    }

    res.json({ success: true, inquiries: createdInquiries });
  } catch (error) {
    console.error('Cart RFQ error:', error);
    res.status(500).json({ error: 'Failed to process cart RFQ' });
  }
});

export default router;
