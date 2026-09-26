import { adminDb } from "./src/lib/firebase-admin.ts";
import { db } from "./src/db/index.ts";
import { inquiries, products, users } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

export async function fixOldInquiries() {
  try {
    const snapshot = await adminDb.collection('inquiries').get();
    let fixed = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.buyerUid || !data.sellerUid) {
         let updates: any = {};
         const inq = await db.select().from(inquiries).where(eq(inquiries.id, parseInt(doc.id)));
         if (inq.length > 0) {
           const { buyerId, targetProductId } = inq[0];
           
           if (!data.buyerUid && buyerId) {
              const userRes = await db.select().from(users).where(eq(users.id, buyerId));
              if (userRes.length > 0) updates.buyerUid = userRes[0].uid;
           }
           
           if (!data.sellerUid && targetProductId) {
              const prodRes = await db.select().from(products).where(eq(products.id, targetProductId));
              if (prodRes.length > 0) {
                const sellerId = prodRes[0].sellerId;
                const sellerRes = await db.select().from(users).where(eq(users.id, sellerId));
                if (sellerRes.length > 0) updates.sellerUid = sellerRes[0].uid;
              }
           } else if (!data.sellerUid && data.sellerId) {
              const sellerRes = await db.select().from(users).where(eq(users.id, data.sellerId));
              if (sellerRes.length > 0) updates.sellerUid = sellerRes[0].uid;
           }
           
           if (Object.keys(updates).length > 0) {
              await doc.ref.update(updates);
              fixed++;
           }
         }
      }
    }
    if (fixed > 0) console.log(`Fixed ${fixed} old inquiries in Firestore`);
  } catch (err) {
    console.error("Migration failed, likely missing Firestore permissions locally", err);
  }
}
