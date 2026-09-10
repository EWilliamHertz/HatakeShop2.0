import { adminDb } from "./src/lib/firebase-admin.ts";
import { db } from "./src/db/index.ts";
import { inquiries, products, users } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function run() {
  const snapshot = await adminDb.collection('inquiries').get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(doc.id, '=>', data);
    
    // Check if missing buyerUid or sellerUid
    if (!data.buyerUid || !data.sellerUid) {
       console.log('Fixing doc', doc.id);
       
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
            console.log('Applying updates', updates);
            await doc.ref.update(updates);
         }
       }
    }
  }
}

run().catch(console.error);
