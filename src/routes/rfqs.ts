import { Router } from "express";
import { db, ensureLeadsCrmSchema } from "../db/index.js";
import { users, companies, products, inquiries, inquiryMessages, leads, reviews, notifications } from '../db/schema.js';
import { not, eq, or, and, isNull, desc, inArray, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getUserProfile } from "../db/users.js";
import { getStripe, resend } from "../lib/services.js";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
import { parseLeadGeo, normalizeCountryName } from "../lib/leadGeo.js";
import { adminDb } from "../lib/firebase-admin.js";

const router = Router();

router.post(["/inquiries", "/api/inquiries", "/api-v2/inquiries"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const { targetProductId, quantity, targetBudget, currency, shippingDestination, aiNotes, status, isBlindDropship, dropshipConsumerName, dropshipConsumerAddress } = req.body;
    
    const result = await db.insert(inquiries).values({
      buyerId: userProfile.id,
      targetProductId,
      quantity,
      targetBudget,
      currency,
      shippingDestination,
      aiNotes,
      status: status || 'Pending',
      isBlindDropship: isBlindDropship || false,
      dropshipConsumerName: dropshipConsumerName || null,
      dropshipConsumerAddress: dropshipConsumerAddress || null
    }).returning();
    
    const newInquiry = result[0];
    
    if (targetProductId) {
      const productInfo = await db.select({ sellerUid: users.uid, sellerEmail: users.email, productTitle: products.title, notificationEmails: users.notificationEmails })
        .from(products)
        .innerJoin(users, eq(products.sellerId, users.id))
        .where(eq(products.id, targetProductId));
        
      if (productInfo.length > 0) {
        const { sellerUid, sellerEmail, productTitle, notificationEmails } = productInfo[0];
        await adminDb.collection('inquiries').doc(newInquiry.id.toString()).set({
          buyerUid: req.user.uid,
          sellerUid: sellerUid
        });
        
        try {
          const sellerDb = await db.select().from(users).where(eq(users.uid, sellerUid)).limit(1);
          if (sellerDb.length > 0) {
            await db.insert(notifications).values({
              userId: sellerDb[0].id,
              title: "New Order!",
              message: "You have a new order waiting.",
              link: "/orders"
            });
          }
        } catch(e) { console.error("Failed to insert order notification", e); }
        
        const io = (req as any).io;
        if (io) {
          io.to(`user_${sellerUid}`).emit("inquiry_updated");
        }

        if (sellerEmail) {
          try {
            const buyerName = userProfile.companyName || userProfile.displayName;
            const htmlBody = generateB2BEmailHtml(
              "New Request for Quote (RFQ)",
              `Good news! <b>${buyerName}</b> has submitted a new RFQ for <b>${quantity} units</b> of <b>${productTitle}</b>.<br/><br/>Target Budget: ${targetBudget} ${currency}<br/><br/>Click the link below to view the request and respond with an official quote.`,
              `${process.env.APP_URL || 'https://hatake.shop'}/rfq/${newInquiry.id}`
            );

            await resend.emails.send({
              from: "Hatake.Shop <notifications@hatake.shop>",
              to: Array.from(new Set([sellerEmail, ...((notificationEmails as string[]) || [])])).filter(Boolean).slice(0, 5),
              subject: `New RFQ Received: ${quantity}x ${productTitle}`,
              html: htmlBody
            });
          } catch (emailErr) {
            console.error("Failed to send RFQ notification email:", emailErr);
          }
        }
      }
    }
    
    res.json(newInquiry);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get(["/inquiries", "/api/inquiries", "/api-v2/inquiries"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
    const sellerProducts = await db.select({ id: products.id }).from(products).where(eq(products.sellerId, teamOwnerId));
    const sellerProductIds = sellerProducts.map(p => p.id);
    
    const userInquiriesData = await db.query.inquiries.findMany({
       where: sellerProductIds.length > 0 
            ? or(eq(inquiries.buyerId, teamOwnerId), eq(inquiries.buyerId, userProfile.id), inArray(inquiries.targetProductId, sellerProductIds))
            : or(eq(inquiries.buyerId, teamOwnerId), eq(inquiries.buyerId, userProfile.id)),
       with: {
          product: { with: { seller: true } },
          buyer: true,
          messages: {
             orderBy: [desc(inquiryMessages.createdAt)],
             limit: 1,
             with: { sender: true }
          }
       },
       orderBy: [desc(inquiries.createdAt)]
    });
    
    const mapped = userInquiriesData.map(inq => ({
       inquiry: inq,
       product: inq.product,
       seller: inq.product?.seller,
       buyer: inq.buyer
    }));
    
    res.json(mapped);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/reviews", "/api/reviews", "/api-v2/reviews"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");
    
    const { targetUserId, targetProductId, inquiryId, rating, title, comment, images } = req.body;

    let verifiedTransactionQuery;
    
    if (targetProductId) {
       verifiedTransactionQuery = await db.select().from(inquiries)
          .where(and(
            eq(inquiries.buyerId, userProfile.id),
            eq(inquiries.targetProductId, targetProductId),
            inArray(inquiries.paymentStatus, ['Paid', 'Escrow Released', 'Escrow Funded'])
          ));
    } else if (targetUserId) {
       verifiedTransactionQuery = await db.select().from(inquiries)
          .innerJoin(products, eq(inquiries.targetProductId, products.id))
          .where(and(
            eq(inquiries.buyerId, userProfile.id),
            eq(products.sellerId, targetUserId),
            inArray(inquiries.paymentStatus, ['Paid', 'Escrow Released', 'Escrow Funded'])
          ));
    }

    if ((!verifiedTransactionQuery || verifiedTransactionQuery.length === 0) && userProfile.role !== 'admin') {
       return res.status(403).json({ error: "You can only review suppliers after completing a verified transaction." });
    }

    const [review] = await db.insert(reviews).values({
      reviewerId: userProfile.id,
      targetUserId,
      targetProductId,
      inquiryId: inquiryId || null,
      rating,
      title,
      comment,
      images: images || []
    }).returning();
    
    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

router.get(["/users/:id/reviews", "/api/users/:id/reviews", "/api-v2/users/:id/reviews"], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userReviews = await db.query.reviews.findMany({
      where: eq(reviews.targetUserId, id),
      with: { reviewer: true }
    });
    res.json(userReviews);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post(["/inquiries/:id/escrow/release", "/api/inquiries/:id/escrow/release", "/api-v2/inquiries/:id/escrow/release"], requireAuth, async (req: AuthRequest, res) => {
  try {
        if (!req.user) return res.status(401).send("Unauthorized");
        const userProfile = await getUserProfile(req.user.uid);
        
        const id = parseInt(req.params.id);
        const inquiry = await db.query.inquiries.findFirst({ where: eq(inquiries.id, id) });
        if (!inquiry || inquiry.buyerId !== userProfile.id) return res.status(403).json({ error: "Unauthorized" });

        if (inquiry.paymentStatus !== 'Escrow Funded') {
            return res.status(400).json({ error: "Cannot release escrow from current status" });
        }

        const productInfo = await db.select({ sellerId: products.sellerId, unitCost: products.unitCost }).from(products).where(eq(products.id, inquiry.targetProductId!));
        let transferSuccess = false;
        let transferError: string | null = null;

        if (productInfo.length > 0) {
            const sellerInfo = await db.select({ stripeAccountId: users.stripeAccountId, uid: users.uid, email: users.email }).from(users).where(eq(users.id, productInfo[0].sellerId));
            
            const lastQuote = await db.query.inquiryMessages.findFirst({
              where: and(eq(inquiryMessages.inquiryId, inquiry.id), eq(inquiryMessages.isOfficialQuote, true)),
              orderBy: [desc(inquiryMessages.createdAt)]
            });

            const unitCost = Number(lastQuote?.unitPriceProposed || productInfo[0].unitCost || 0);
            const totalAmount = Math.round(unitCost * inquiry.quantity * 100);
            const platformFee = Math.round(totalAmount * 0.045);
            const amountToTransfer = Math.max(0, totalAmount - platformFee);
            
            if (sellerInfo[0]?.stripeAccountId && amountToTransfer > 0) {
              const stripe = getStripe();
              if (stripe) {
                try {
                  await stripe.transfers.create({
                    amount: amountToTransfer,
                    currency: (inquiry.currency || 'USD').toLowerCase(),
                    destination: sellerInfo[0].stripeAccountId,
                    description: `Escrow release for RFQ #${inquiry.id}`
                  });
                  transferSuccess = true;
                } catch (stripeErr: any) {
                  console.error("[Stripe Transfer Error]:", stripeErr.message);
                  transferError = stripeErr.message;
                }
              }
            }
        }

        await db.update(inquiries)
            .set({ escrowReleaseStatus: 'approved', paymentStatus: 'Escrow Released' })
            .where(eq(inquiries.id, id));
            
        const io = (req as any).io;
        if (io) {
            io.to(`inquiry_${id}`).emit("inquiry_updated", { paymentStatus: 'Escrow Released', escrowReleaseStatus: 'approved' });
        }
            
        res.json({ success: true, transferSuccess, transferError });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message || "Failed to release escrow" });
    }
});

router.get(["/inquiries/:id/invoice", "/api/inquiries/:id/invoice", "/api-v2/inquiries/:id/invoice"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const inquiry = await db.query.inquiries.findFirst({
      where: eq(inquiries.id, id),
      with: {
        product: { with: { seller: true } },
        buyer: true,
        messages: true
      }
    });
    if (!inquiry) return res.status(404).send("Not found");
    
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("COMMERCIAL INVOICE", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Invoice Number: INV-${inquiry.id.toString().padStart(6, '0')}`, 20, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 42);
    
    doc.text("FROM:", 20, 55);
    doc.text(inquiry.product.seller.companyName || inquiry.product.seller.displayName || "Seller", 20, 62);
    doc.text(inquiry.product.seller.email || "", 20, 69);
    
    doc.text("TO:", 120, 55);
    doc.text(inquiry.buyer.companyName || inquiry.buyer.displayName || "Buyer", 120, 62);
    doc.text(inquiry.buyer.email || "", 120, 69);
    
    let price = 0;
    const quoteMsg = inquiry.messages.reverse().find(m => m.isOfficialQuote);
    if (quoteMsg && quoteMsg.unitPriceProposed) {
       price = parseFloat(quoteMsg.unitPriceProposed);
    }
    
    doc.line(20, 80, 190, 80);
    doc.text("Item", 20, 87);
    doc.text("Quantity", 100, 87);
    doc.text("Unit Price", 140, 87);
    doc.text("Total", 170, 87);
    doc.line(20, 90, 190, 90);
    
    doc.text(inquiry.product.title.substring(0, 30), 20, 100);
    doc.text(inquiry.quantity.toString(), 100, 100);
    doc.text(`$${price.toFixed(2)}`, 140, 100);
    doc.text(`$${(price * inquiry.quantity).toFixed(2)}`, 170, 100);
    
    doc.line(20, 110, 190, 110);
    doc.text("TOTAL DUE:", 140, 120);
    doc.text(`$${(price * inquiry.quantity).toFixed(2)}`, 170, 120);
    
    const buffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${inquiry.id}.pdf`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to generate PDF");
  }
});

router.get(["/inquiries/:id/messages", "/api/inquiries/:id/messages", "/api-v2/inquiries/:id/messages"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const inquiryId = parseInt(req.params.id, 10);
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const inquiry = await db.query.inquiries.findFirst({
      where: eq(inquiries.id, inquiryId),
      with: { product: true }
    });
    
    if (!inquiry) return res.status(404).json({ error: "Not found" });
    if (inquiry.buyerId !== userProfile.id && inquiry.product?.sellerId !== userProfile.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const msgs = await db.query.inquiryMessages.findMany({
      where: eq(inquiryMessages.inquiryId, inquiryId),
      orderBy: [asc(inquiryMessages.createdAt)],
      with: { sender: true }
    });
    
    const mappedMsgs = msgs.map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderUid: m.sender?.uid || "",
      senderName: m.sender?.companyName || m.sender?.displayName || "User",
      text: m.messageContent,
      type: m.isOfficialQuote ? 'quote' : 'text',
      attachment: m.attachmentUrl,
      readReceipt: m.readReceipt,
      quoteData: m.isOfficialQuote ? {
        unitPrice: m.unitPriceProposed,
        moq: m.moqProposed,
        leadTimeDays: m.leadTimeProposed,
        status: inquiry.status === 'Accepted' ? 'accepted' : 'pending'
      } : null,
      createdAt: m.createdAt
    }));
    
    res.json(mappedMsgs);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/inquiries/:id/messages", "/api/inquiries/:id/messages", "/api-v2/inquiries/:id/messages"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const inquiryId = parseInt(req.params.id, 10);
    const { text, type = "text", quoteData, attachment } = req.body;
    
    const userProfile = await getUserProfile(req.user.uid);
    
    const inquiry = await db.query.inquiries.findFirst({
      where: eq(inquiries.id, inquiryId),
      with: { product: true }
    });
    
    if (!inquiry) return res.status(404).json({ error: "Not found" });

    const isOfficialQuote = type === 'quote';

    const [newMsg] = await db.insert(inquiryMessages).values({
       inquiryId: inquiry.id,
       senderId: userProfile.id,
       messageContent: text || "",
       attachmentUrl: attachment || null,
       isOfficialQuote,
       unitPriceProposed: quoteData?.unitPrice?.toString() || null,
       moqProposed: quoteData?.moq ? parseInt(quoteData.moq) : null,
       leadTimeProposed: quoteData?.leadTimeDays ? parseInt(quoteData.leadTimeDays) : null,
    }).returning();
    
    const mappedNewMsg = {
      id: newMsg.id,
      senderId: newMsg.senderId,
      senderUid: userProfile.uid,
      senderName: userProfile.companyName || userProfile.displayName || "User",
      text: newMsg.messageContent,
      type: newMsg.isOfficialQuote ? 'quote' : 'text',
      attachment: newMsg.attachmentUrl,
      readReceipt: newMsg.readReceipt,
      quoteData: newMsg.isOfficialQuote ? {
        unitPrice: newMsg.unitPriceProposed,
        moq: newMsg.moqProposed,
        leadTimeDays: newMsg.leadTimeProposed,
        status: inquiry.status === 'Accepted' ? 'accepted' : 'pending'
      } : null,
      createdAt: newMsg.createdAt
    };
    
    const io = (req as any).io;
    if (io) {
      io.to(`inquiry_${inquiryId}`).emit("new_message", mappedNewMsg);
    }
    
    res.json(mappedNewMsg);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/inquiries/:id/accept-quote", "/api/inquiries/:id/accept-quote", "/api-v2/inquiries/:id/accept-quote"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const inquiryId = parseInt(req.params.id, 10);
    const { messageId } = req.body;
    
    const userProfile = await getUserProfile(req.user.uid);
    
    const inquiry = await db.query.inquiries.findFirst({
       where: eq(inquiries.id, inquiryId),
       with: { product: true }
    });
    if (!inquiry) return res.status(404).send("Inquiry not found");
    if (inquiry.buyerId !== userProfile.id) return res.status(403).send("Only buyer can accept quote");
    
    await db.update(inquiries).set({
       status: 'Accepted'
    }).where(eq(inquiries.id, inquiryId));
    
    await adminDb.collection("users").doc(inquiry.product?.sellerId?.toString() || '').collection("notifications").add({
      title: "Quote Accepted",
      body: "The buyer has accepted your quote.",
      read: false,
      createdAt: new Date(),
      link: `/rfq/${inquiryId}`
    });
    
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/inquiries/:id/sign", "/api/inquiries/:id/sign", "/api-v2/inquiries/:id/sign"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const inquiryId = parseInt(req.params.id, 10);
    const { signature } = req.body;
    if (!signature) return res.status(400).send("Signature missing");
    
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const inquiryData = await db.query.inquiries.findFirst({
      where: eq(inquiries.id, inquiryId),
      with: { product: true }
    });
    if (!inquiryData) return res.status(404).send("Inquiry not found");
    
    const isBuyer = inquiryData.buyerId === userProfile.id;
    const isSeller = inquiryData.product?.sellerId === userProfile.id;

    if (!isBuyer && !isSeller) return res.status(403).send("Forbidden");

    const updateData: any = {};
    
    const io = (req as any).io;
    if (io) {
      io.to(`inquiry_${inquiryId}`).emit("inquiry_updated", updateData);
    }
    
    res.json({ success: true, ...updateData });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/inquiries/:id/accept", "/api/inquiries/:id/accept", "/api-v2/inquiries/:id/accept"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const inquiryId = parseInt(req.params.id, 10);
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");
    
    const inquiryData = await db.select().from(inquiries).where(eq(inquiries.id, inquiryId));
    if (inquiryData.length === 0) return res.status(404).send("Not found");
    
    const inq = inquiryData[0];
    const productInfo = await db.select({ sellerId: products.sellerId, stockQuantity: products.stockQuantity }).from(products).where(eq(products.id, inq.targetProductId!));
    if (productInfo.length === 0) return res.status(404).send("Product not found");
    
    const sellerProfile = await getUserProfile(req.user.uid);
    if (!sellerProfile || sellerProfile.id !== productInfo[0].sellerId) {
       return res.status(403).send("Only the seller can accept the inquiry");
    }
    
    await db.update(inquiries).set({ status: 'Accepted' }).where(eq(inquiries.id, inquiryId));
    
    const newStock = Math.max(0, (productInfo[0].stockQuantity || 0) - inq.quantity);
    await db.update(products).set({ stockQuantity: newStock }).where(eq(products.id, inq.targetProductId!));
    
    const io = (req as any).io;
    if (io) {
      io.to(`inquiry_${inquiryId}`).emit("inquiry_updated", { status: 'Accepted' });
      io.to(`user_${inq.buyerId}`).emit("inquiry_updated");
    }
    
    res.json({ success: true, newStock });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post(["/inquiries/:id/decline", "/api/inquiries/:id/decline", "/api-v2/inquiries/:id/decline"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const inquiryId = parseInt(req.params.id, 10);
    
    const inquiryData = await db.select().from(inquiries).where(eq(inquiries.id, inquiryId));
    if (inquiryData.length === 0) return res.status(404).send("Not found");
    
    const inq = inquiryData[0];
    const productInfo = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, inq.targetProductId!));
    
    const sellerProfile = await getUserProfile(req.user.uid);
    if (!sellerProfile || sellerProfile.id !== productInfo[0].sellerId) {
       return res.status(403).send("Only the seller can decline the inquiry");
    }
    
    await db.update(inquiries).set({ status: 'Declined' }).where(eq(inquiries.id, inquiryId));
    
    const io = (req as any).io;
    if (io) {
      io.to(`inquiry_${inquiryId}`).emit("inquiry_updated", { status: 'Declined' });
      io.to(`user_${inq.buyerId}`).emit("inquiry_updated");
    }
    
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

function getAppBaseUrl(req: any): string {
  const origin = req.get('origin') || req.headers?.origin;
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const defaultHost = host ? `${protocol}://${host}` : 'https://www.hatake.shop';
  return (process.env.APP_URL || origin || defaultHost).replace(/\/$/, '');
}

router.post(["/stripe/create-account", "/api/stripe/create-account", "/api-v2/stripe/create-account"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe not configured" });

    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    let accountId = userProfile.stripeAccountId;
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch (err: any) {
        if (err?.code === 'resource_missing' || err?.statusCode === 404 || err?.message?.includes('No such account')) {
          accountId = null;
        } else {
          throw err;
        }
      }
    }

    if (!accountId) {
      const accountParams: any = {
        type: 'express',
        email: userProfile.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: userProfile.id.toString(),
          uid: userProfile.uid,
        },
      };

      if (userProfile.companyName && userProfile.companyName.trim()) {
        accountParams.business_type = 'company';
        accountParams.company = { name: userProfile.companyName.trim() };
      }

      if (userProfile.country && userProfile.country.trim().length === 2) {
        accountParams.country = userProfile.country.trim().toUpperCase();
      }

      const account = await stripe.accounts.create(accountParams);
      accountId = account.id;
      await db.update(users).set({ stripeAccountId: accountId }).where(eq(users.id, userProfile.id));
    }

    const baseUrl = getAppBaseUrl(req);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api-v2/stripe/onboard-refresh/${userProfile.id}`,
      return_url: `${baseUrl}/api-v2/stripe/onboard-return/${userProfile.id}`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (e: any) {
    console.error("[Stripe Create Account Error]:", e);
    res.status(500).json({ error: e.message });
  }
});

router.get(["/stripe/status", "/api/stripe/status", "/api-v2/stripe/status"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe not configured" });

    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).json({ error: "User not found" });

    if (!userProfile.stripeAccountId) {
      return res.json({ connected: false, onboardingComplete: false });
    }

    try {
      const account = await stripe.accounts.retrieve(userProfile.stripeAccountId);
      const isComplete = Boolean(account.details_submitted || (account.charges_enabled && account.payouts_enabled));

      if (isComplete !== userProfile.stripeOnboardingComplete) {
        await db.update(users).set({ stripeOnboardingComplete: isComplete }).where(eq(users.id, userProfile.id));
      }

      res.json({
        connected: true,
        stripeAccountId: account.id,
        onboardingComplete: isComplete,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (err: any) {
      if (err?.code === 'resource_missing' || err?.statusCode === 404) {
        await db.update(users).set({ stripeAccountId: null, stripeOnboardingComplete: false }).where(eq(users.id, userProfile.id));
        return res.json({ connected: false, onboardingComplete: false });
      }
      throw err;
    }
  } catch (e: any) {
    console.error("[Stripe Status Error]:", e);
    res.status(500).json({ error: e.message });
  }
});

router.post(["/stripe/dashboard-link", "/api/stripe/dashboard-link", "/api-v2/stripe/dashboard-link"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe not configured" });

    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile?.stripeAccountId) return res.status(400).json({ error: "No connected Stripe account" });

    try {
      const loginLink = await stripe.accounts.createLoginLink(userProfile.stripeAccountId);
      res.json({ url: loginLink.url });
    } catch (linkErr: any) {
      const baseUrl = getAppBaseUrl(req);
      const accountLink = await stripe.accountLinks.create({
        account: userProfile.stripeAccountId,
        refresh_url: `${baseUrl}/api-v2/stripe/onboard-refresh/${userProfile.id}`,
        return_url: `${baseUrl}/api-v2/stripe/onboard-return/${userProfile.id}`,
        type: 'account_onboarding',
      });
      res.json({ url: accountLink.url });
    }
  } catch (e: any) {
    console.error("[Stripe Dashboard Link Error]:", e);
    res.status(500).json({ error: e.message });
  }
});

router.get(["/stripe/onboard-refresh/:id", "/api/stripe/onboard-refresh/:id", "/api-v2/stripe/onboard-refresh/:id"], async (req, res) => {
  const baseUrl = getAppBaseUrl(req);
  res.redirect(`${baseUrl}/seller?stripe_refresh=true`);
});

router.get(["/stripe/onboard-return/:id", "/api/stripe/onboard-return/:id", "/api-v2/stripe/onboard-return/:id"], async (req, res) => {
  const baseUrl = getAppBaseUrl(req);
  try {
    const stripe = getStripe();
    const userId = parseInt(req.params.id, 10);
    const userProfile = await db.select().from(users).where(eq(users.id, userId));
    if (userProfile.length === 0 || !userProfile[0].stripeAccountId || !stripe) {
       return res.redirect(`${baseUrl}/seller?stripe_error=true`);
    }

    const account = await stripe.accounts.retrieve(userProfile[0].stripeAccountId);
    const isComplete = Boolean(account.details_submitted || (account.charges_enabled && account.payouts_enabled));
    if (isComplete) {
       await db.update(users).set({ stripeOnboardingComplete: true }).where(eq(users.id, userId));
       res.redirect(`${baseUrl}/seller?stripe_success=true`);
    } else {
       res.redirect(`${baseUrl}/seller?stripe_incomplete=true`);
    }
  } catch (e) {
    console.error("[Stripe Onboard Return Error]:", e);
    res.redirect(`${baseUrl}/seller?stripe_error=true`);
  }
});

router.post(["/stripe/create-checkout-session", "/api/stripe/create-checkout-session", "/api-v2/stripe/create-checkout-session"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe not configured" });

    const { inquiryId } = req.body;
    const inquiryData = await db.select().from(inquiries).where(eq(inquiries.id, inquiryId));
    if (inquiryData.length === 0) return res.status(404).send("Not found");
    const inq = inquiryData[0];
    
    const productData = await db.select().from(products).where(eq(products.id, inq.targetProductId));
    if (productData.length === 0) return res.status(404).send("Product not found");
    const prod = productData[0];

    const sellerData = await db.select().from(users).where(eq(users.id, prod.sellerId));
    if (sellerData.length === 0 || !sellerData[0].stripeAccountId || !sellerData[0].stripeOnboardingComplete) {
       return res.status(400).json({ error: "Seller has not completed Stripe onboarding and cannot receive payments yet" });
    }

    const lastQuote = await db.query.inquiryMessages.findFirst({
      where: and(eq(inquiryMessages.inquiryId, inq.id), eq(inquiryMessages.isOfficialQuote, true)),
      orderBy: [desc(inquiryMessages.createdAt)]
    });

    const unitCost = Number(lastQuote?.unitPriceProposed || prod.unitCost || prod.unitPrice || 0);
    if (unitCost <= 0) {
      return res.status(400).json({ error: "Invalid price for checkout" });
    }

    const totalAmountCents = Math.round(unitCost * inq.quantity * 100);
    const platformFeeCents = Math.round(totalAmountCents * 0.045);
    const currency = (inq.currency || 'USD').toLowerCase();
    const baseUrl = getAppBaseUrl(req);

    const buyerUser = await getUserProfile(req.user.uid);

    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: prod.title,
            description: `B2B Order for ${inq.quantity} units (${prod.originType || 'Direct Wholesale'})`,
          },
          unit_amount: Math.round(unitCost * 100),
        },
        quantity: inq.quantity,
      }],
      mode: 'payment',
      payment_intent_data: {
        metadata: {
          inquiryId: inq.id.toString(),
          sellerId: sellerData[0].id.toString(),
          sellerStripeAccountId: sellerData[0].stripeAccountId,
          platformFeeCents: platformFeeCents.toString(),
        }
      },
      metadata: {
        inquiryId: inq.id.toString(),
        sellerId: sellerData[0].id.toString(),
        buyerId: inq.buyerId.toString(),
      },
      success_url: `${baseUrl}/rfq/${inq.id}?payment=success`,
      cancel_url: `${baseUrl}/rfq/${inq.id}?payment=cancelled`,
    };

    if (buyerUser?.email && buyerUser.email !== 'guest@hatake.shop') {
      sessionParams.customer_email = buyerUser.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    await db.update(inquiries).set({ stripeCheckoutSessionId: session.id }).where(eq(inquiries.id, inq.id));

    res.json({ url: session.url });
  } catch (e: any) {
    console.error("[Stripe RFQ Checkout Error]:", e);
    res.status(500).json({ error: e.message });
  }
});

router.get(["/public/partners", "/api/public/partners", "/api-v2/public/partners"], async (req, res) => {
  try {
    await ensureLeadsCrmSchema();
    const invitedLeads = await db.select({
      companyName: leads.companyName,
      location: leads.location,
      country: leads.country,
      state: leads.state,
      city: leads.city,
      website: leads.website,
      segment: leads.segment,
      status: leads.status,
    }).from(leads).where(not(eq(leads.status, 'pending')));

    const responseList: any[] = invitedLeads
      .filter(l => l.companyName)
      .map(l => {
        const geo = parseLeadGeo({
          country: l.country,
          state: l.state,
          city: l.city,
          location: l.location,
          website: l.website,
        });
        return {
          name: l.companyName,
          country: geo.country || null,
          state: geo.state || null,
          city: geo.city || null,
          location: geo.location || [geo.city, geo.country].filter(Boolean).join(', ') || null,
          website: l.website || null,
          companyFocus: l.segment === 'Sports' ? 'Sports Cards & Memorabilia' : 'Trading Cards & Games',
          signedUp: l.status === 'recruited',
          contacted: true,
          isLeadOnly: l.status !== 'recruited',
        };
      });

    const allCompanies = await db.select().from(companies);
    const companyById = new Map<number, any>(allCompanies.map(c => [c.id, c]));
    const companyByNormName = new Map<string, any>(
      allCompanies.map(c => [c.name.toLowerCase().replace(/\s+/g, ''), c])
    );

    const sellers = await db.select({
      id: users.id,
      companyName: users.companyName,
      activeCompanyId: users.activeCompanyId,
      country: users.country,
      shippingCity: users.shippingCity,
      verificationStatus: users.verificationStatus,
      profilePictureUrl: users.profilePictureUrl,
      region: users.region,
      companyFocus: users.companyFocus,
      website: users.website,
    }).from(users).where(and(
      or(eq(users.role, 'seller'), eq(users.role, 'both'), eq(users.role, 'admin')),
      isNull(users.teamOwnerId)
    ));

    const normKey = (s?: string | null) => (s || '').toLowerCase().replace(/\s+/g, '');

    for (const seller of sellers) {
      if (!seller.companyName) continue;
      const key = normKey(seller.companyName);
      const matchedComp =
        (seller.activeCompanyId ? companyById.get(seller.activeCompanyId) : null) ||
        companyByNormName.get(key) ||
        null;

      const displayName = matchedComp?.name || seller.companyName;
      const country = normalizeCountryName(seller.country || matchedComp?.country) || null;
      const city = seller.shippingCity ? String(seller.shippingCity).trim() || null : null;
      const region = seller.region || matchedComp?.region || null;
      const logo = seller.profilePictureUrl || matchedComp?.logoUrl || null;

      const existingIdx = responseList.findIndex(r => normKey(r.name) === normKey(displayName));
      const entry = {
        id: seller.id,
        name: displayName,
        country,
        city,
        location: [city, country].filter(Boolean).join(', ') || country || 'Global',
        region,
        website: seller.website || matchedComp?.website || null,
        companyFocus: seller.companyFocus || 'Trading Cards & Games',
        profilePictureUrl: logo,
        signedUp: true,
        contacted: true,
        verificationStatus: seller.verificationStatus,
        isLeadOnly: false,
      };

      if (existingIdx > -1) {
        // Prefer row with logo / country / lower primary seller ID
        const prev = responseList[existingIdx];
        if (prev.isLeadOnly) {
          responseList[existingIdx] = entry;
        } else {
          responseList[existingIdx] = {
            ...prev,
            id: prev.id || entry.id,
            country: prev.country || entry.country,
            city: prev.city || entry.city,
            location: prev.country ? prev.location : entry.location,
            region: prev.region || entry.region,
            profilePictureUrl: prev.profilePictureUrl || entry.profilePictureUrl,
            verificationStatus:
              prev.verificationStatus === 'verified' || prev.verificationStatus === 'audited'
                ? prev.verificationStatus
                : entry.verificationStatus,
          };
        }
      } else {
        responseList.push(entry);
      }
    }

    // Sort joined/verified partners first, then alphabetically
    responseList.sort((a, b) => {
      const aJoined = a.signedUp || !a.isLeadOnly ? 1 : 0;
      const bJoined = b.signedUp || !b.isLeadOnly ? 1 : 0;
      if (aJoined !== bJoined) return bJoined - aJoined;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    res.json(responseList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get(["/inquiries/:id", "/api/inquiries/:id", "/api-v2/inquiries/:id"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const inquiryId = parseInt(req.params.id, 10);
    
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const inquiryData = await db.select({
      inquiry: inquiries,
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
        createdAt: products.createdAt
      },
      seller: { companyName: users.companyName }
    }).from(inquiries)
      .leftJoin(products, eq(inquiries.targetProductId, products.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(inquiries.id, inquiryId));
      
    if (inquiryData.length === 0) return res.status(404).json({ error: "Not found" });
    
    const inquiryObj = inquiryData[0];
    const buyerData = await db.query.users.findFirst({
      where: eq(users.id, inquiryObj.inquiry.buyerId)
    });
    
    res.json({ ...inquiryObj, buyer: buyerData });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



export default router;
