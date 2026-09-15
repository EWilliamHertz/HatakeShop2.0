import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, inquiries, inquiryMessages, leads, reviews } from "../db/schema.js";
import { not, eq, or, and, isNull, desc, inArray, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getUserProfile } from "../db/users.js";
import { getStripe, resend } from "../lib/services.js";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
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
      const productInfo = await db.select({ sellerUid: users.uid, sellerEmail: users.email, productTitle: products.title })
        .from(products)
        .innerJoin(users, eq(products.sellerId, users.id))
        .where(eq(products.id, targetProductId));
        
      if (productInfo.length > 0) {
        const { sellerUid, sellerEmail, productTitle } = productInfo[0];
        await adminDb.collection('inquiries').doc(newInquiry.id.toString()).set({
          buyerUid: req.user.uid,
          sellerUid: sellerUid
        });
        
        await adminDb.collection('users').doc(sellerUid).collection('notifications').add({
          title: 'New RFQ Received',
          body: `You have received a new RFQ for ${quantity} units.`,
          read: false,
          createdAt: new Date(),
          link: `/rfq/${newInquiry.id}`
        });
        
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
              to: sellerEmail,
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
        if (productInfo.length > 0) {
            const sellerInfo = await db.select({ stripeAccountId: users.stripeAccountId }).from(users).where(eq(users.id, productInfo[0].sellerId));
            
            const unitCost = Number(productInfo[0].unitCost) || 0;
            const totalAmount = Math.round(unitCost * inquiry.quantity * 100);
            const platformFee = Math.round(totalAmount * 0.045);
            const amountToTransfer = totalAmount - platformFee;
            
            if (sellerInfo[0]?.stripeAccountId) {
              const stripe = getStripe();
              if (stripe) {
              try {
                await stripe.transfers.create({
                  amount: amountToTransfer,
                  currency: inquiry.currency.toLowerCase(),
                  destination: sellerInfo[0].stripeAccountId,
                  description: `Escrow release for RFQ ${inquiry.id}`
                });
              } catch (stripeErr) {
                console.error("Stripe Transfer Failed, assuming test mode:", stripeErr);
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
            
        res.json({ success: true });
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

router.post(["/stripe/create-account", "/api/stripe/create-account", "/api-v2/stripe/create-account"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe not configured" });

    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    let accountId = userProfile.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userProfile.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: 'company',
        company: { name: userProfile.companyName || '' }
      });
      accountId = account.id;
      await db.update(users).set({ stripeAccountId: accountId }).where(eq(users.id, userProfile.id));
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/stripe/onboard-refresh/${userProfile.id}`,
      return_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/stripe/onboard-return/${userProfile.id}`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get(["/stripe/onboard-refresh/:id", "/api/stripe/onboard-refresh/:id", "/api-v2/stripe/onboard-refresh/:id"], async (req, res) => {
   res.redirect('/seller?stripe_refresh=true');
});

router.get(["/stripe/onboard-return/:id", "/api/stripe/onboard-return/:id", "/api-v2/stripe/onboard-return/:id"], async (req, res) => {
  try {
    const stripe = getStripe();
    const userId = parseInt(req.params.id, 10);
    const userProfile = await db.select().from(users).where(eq(users.id, userId));
    if (userProfile.length === 0 || !userProfile[0].stripeAccountId || !stripe) {
       return res.redirect('/seller?stripe_error=true');
    }

    const account = await stripe.accounts.retrieve(userProfile[0].stripeAccountId);
    if (account.details_submitted) {
       await db.update(users).set({ stripeOnboardingComplete: true }).where(eq(users.id, userId));
       res.redirect('/seller?stripe_success=true');
    } else {
       res.redirect('/seller?stripe_incomplete=true');
    }
  } catch (e) {
    console.error(e);
    res.redirect('/seller?stripe_error=true');
  }
});

router.post(["/stripe/create-checkout-session", "/api/stripe/create-checkout-session", "/api-v2/stripe/create-checkout-session"], requireAuth, async (req, res) => {
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
       return res.status(400).json({ error: "Seller is not ready to receive payments" });
    }

    const unitCost = Number(prod.unitCost) || 0;
    const totalAmount = Math.round(unitCost * inq.quantity * 100);
    const platformFee = Math.round(totalAmount * 0.045);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: inq.currency.toLowerCase(),
          product_data: {
            name: prod.title,
            description: `PO for ${inq.quantity} units`,
          },
          unit_amount: Math.round(unitCost * 100),
        },
        quantity: inq.quantity,
      }],
      mode: 'payment',
      payment_intent_data: {},
      metadata: {
           inquiryId: inq.id.toString()
      },
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/rfq/${inq.id}?payment=success`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/rfq/${inq.id}?payment=cancelled`,
    });
    
    await db.update(inquiries).set({ stripeCheckoutSessionId: session.id }).where(eq(inquiries.id, inq.id));

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get(["/public/partners", "/api/public/partners", "/api-v2/public/partners"], async (req, res) => {
  try {
    const invitedLeads = await db.select({ 
      companyName: leads.companyName, 
      location: leads.location, 
      status: leads.status 
    }).from(leads).where(not(eq(leads.status, 'pending')));
    
    const responseList = invitedLeads.map(l => ({
      name: l.companyName,
      location: l.location,
      signedUp: l.status === 'recruited',
      contacted: true,
      isLeadOnly: true
    })).filter(l => l.name);

    const sellers = await db.select({ id: users.id, companyName: users.companyName, country: users.country, verificationStatus: users.verificationStatus, profilePictureUrl: users.profilePictureUrl, region: users.region, companyFocus: users.companyFocus }).from(users).where(and(
      or(eq(users.role, 'seller'), eq(users.role, 'both'), eq(users.role, 'admin')),
      isNull(users.teamOwnerId)
    ));
    
    for (const seller of sellers) {
       if (seller.companyName) {
          const existingIdx = responseList.findIndex(r => r.name === seller.companyName);
          if (existingIdx > -1) responseList.splice(existingIdx, 1);
          
          responseList.push({ 
            id: seller.id,
            name: seller.companyName, 
            location: seller.country, 
            region: seller.region,
            companyFocus: seller.companyFocus,
            profilePictureUrl: seller.profilePictureUrl,
            signedUp: true, 
            contacted: true,
            verificationStatus: seller.verificationStatus,
            isLeadOnly: false
          });
       }
    }

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
