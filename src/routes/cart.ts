import { Router } from 'express';
import { requireAuth, AuthRequest } from './auth.js';
import { db } from '../db/index.js';
import { inquiries, products, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { adminDb } from '../lib/firebase-admin.js';
import { getUserProfile } from './auth.js';

const router = Router();

router.post(["/cart/rfq", "/api/cart/rfq", "/api-v2/cart/rfq"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const { items } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).send("Invalid items");

    const createdInquiries = [];

    for (const item of items) {
      const result = await db.insert(inquiries).values({
        buyerId: userProfile.id,
        targetProductId: item.productId,
        quantity: item.quantity || 1,
        targetBudget: item.unitCost ? (item.unitCost * (item.quantity || 1)).toString() : null,
        status: 'Draft',
        aiNotes: 'Auto-generated from Multi-Vendor Cart RFQ checkout.',
      }).returning();
      
      const newInquiry = result[0];
      createdInquiries.push(newInquiry);

      // Trigger seller notification
      const productInfo = await db.select({ sellerUid: users.uid, sellerEmail: users.email, productTitle: products.title })
        .from(products).innerJoin(users, eq(products.sellerId, users.id)).where(eq(products.id, item.productId));
        
      if (productInfo.length > 0) {
        const { sellerUid, sellerEmail, productTitle } = productInfo[0];
        await adminDb.collection('inquiries').doc(newInquiry.id.toString()).set({
          id: newInquiry.id,
          buyerId: userProfile.id,
          targetProductId: item.productId,
          productTitle,
          quantity: item.quantity || 1,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          unreadCountBuyer: 0,
          unreadCountSeller: 1
        });
      }
    }

    res.json({ success: true, inquiries: createdInquiries });
  } catch (error) {
    console.error("Cart RFQ error:", error);
    res.status(500).json({ error: "Failed to process cart RFQ" });
  }
});

export default router;
