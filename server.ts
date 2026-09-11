import 'dotenv/config';
import EasyPostClient from '@easypost/api';
import { FieldValue } from "firebase-admin/firestore";
import express from "express";
import { validateEnv } from "./src/envValidator.js";
import bcrypt from "bcryptjs";
validateEnv();
import { generateB2BEmailHtml } from "./src/lib/emailTemplate.ts";
import Stripe from 'stripe';
import crypto from "crypto";
import { Resend } from "resend";

/* removed resend */

import { resend, ai, generateEmbedding, getStripe, getEasyPost } from "./src/lib/services.js";
import { requireAdmin, requireSeller } from "./src/middleware/roles.js";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import { adminDb, adminAuth } from "./src/lib/firebase-admin.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser, getUserProfile, updateUserProfile } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { products, categories, inquiries, inquiryMessages, users, marketing_logs, affiliates, leads, reviews, feedback, wishlists } from "./src/db/schema.ts";
import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { fixOldInquiries } from "./fix_old_inquiries.ts";
import adminRouter from "./src/routes/admin.js";
import authRouter from "./src/routes/auth.js";
import productsRouter from "./src/routes/products.js";
import leadsRouter from "./src/routes/leads.js";
import webhooksRouter from "./src/routes/webhooks.js";
import categoriesRouter from "./src/routes/categories.js";

/* removed ai */

/* removed generateEmbedding */ async function __dummy_generate() {
  if (!text) return null;
  try {
    const aiResponse = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    return aiResponse.embeddings[0].values;
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return null;
  }
}


  // Background task to process drip campaigns
  setInterval(async () => {
    try {
      console.log("Running CRM Drip processor...");
      const now = new Date();
      // Find leads that need drip 2 (3 days after sent) or drip 3 (7 days after)
      const pendingLeads = await db.select().from(leads).where(eq(leads.status, 'sent'));
      for (const lead of pendingLeads) {
         if (!lead.sentAt) continue;
         const daysSinceSent = (now.getTime() - new Date(lead.sentAt).getTime()) / (1000 * 3600 * 24);
         const lastEmailedDays = lead.lastEmailedAt ? (now.getTime() - new Date(lead.lastEmailedAt).getTime()) / (1000 * 3600 * 24) : daysSinceSent;
         
         let shouldSend = false;
         let nextStep = lead.dripStep || 1;
         
         if (nextStep === 1 && daysSinceSent >= 3) {
           shouldSend = true; nextStep = 2;
         } else if (nextStep === 2 && daysSinceSent >= 7 && lastEmailedDays >= 4) {
           shouldSend = true; nextStep = 3;
         } else if (nextStep === 3 && daysSinceSent >= 14 && lastEmailedDays >= 7) {
           shouldSend = true; nextStep = 4;
         }
         
         if (shouldSend) {
            console.log(`Sending Drip Step ${nextStep} to ${lead.email}`);
            // Mocking email send
            await db.update(leads).set({ dripStep: nextStep, lastEmailedAt: now }).where(eq(leads.id, lead.id));
         }
      }
    } catch (e) {
      console.error("Drip processor error:", e);
    }
  }, 1000 * 60 * 60); // Run every 1 hour

async function startServer() {
  async function getDescendantCategoryIds(dbInstance: any, categoryId: number): Promise<number[]> {
  const allCats = await dbInstance.select({ id: categories.id, parentId: categories.parentId }).from(categories);
  const result = new Set<number>();
  const queue = [categoryId];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (current !== undefined && !result.has(current)) {
      result.add(current);
      const children = allCats.filter((c: any) => c.parentId === current).map((c: any) => c.id);
      queue.push(...children);
    }
  }
  return Array.from(result);
}

// Ensure this doesn't conflict with existing code


let stripeClient = null;
function __dummy_getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-08-26.dahlia' });
  }
  return stripeClient;
}

  

let easypostClient: any = null;
function __dummy_getEasyPost() {
  if (!easypostClient) {
    const key = process.env.EASYPOST_API_KEY;
    if (!key) throw new Error('EASYPOST_API_KEY environment variable is required for live freight calculation.');
    easypostClient = new EasyPostClient(key);
  }
  return easypostClient;
}

const app = express();
    app.use("/", adminRouter);
    app.use("/", authRouter);
    app.use("/", productsRouter);
    app.use("/", leadsRouter);
    app.use("/", webhooksRouter);
    app.use("/", categoriesRouter);
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    socket.on("join_inquiry", (inquiryId) => {
      socket.join(`inquiry_${inquiryId}`);
    });
    
    socket.on("send_message", async (data) => {
      try {
         // data: { inquiryId, senderId, messageContent, attachmentUrl, isOfficialQuote, ... }
         const [newMsg] = await db.insert(inquiryMessages).values({
            inquiryId: data.inquiryId,
            senderId: data.senderId,
            messageContent: data.messageContent || '',
            attachmentUrl: data.attachmentUrl || null,
            isOfficialQuote: data.isOfficialQuote || false,
            unitPriceProposed: data.unitPriceProposed || null,
            moqProposed: data.moqProposed || null,
            leadTimeProposed: data.leadTimeProposed || null,
            shippingTermsProposed: data.shippingTermsProposed || null,
            readReceipt: false
         }).returning();
         
         const msgWithSender = await db.query.inquiryMessages.findFirst({
            where: eq(inquiryMessages.id, newMsg.id),
            with: { sender: true }
         });
         
         io.to(`inquiry_${data.inquiryId}`).emit("new_message", msgWithSender);
      } catch (e) {
         console.error("send_message error:", e);
      }
    });

    socket.on("typing_indicator", (data) => {
      // data: { inquiryId, userId, isTyping }
      socket.to(`inquiry_${data.inquiryId}`).emit("typing_indicator", data);
    });

    socket.on("mark_read", async (data) => {
      // data: { inquiryId, userId }
      try {
         await db.update(inquiryMessages)
            .set({ readReceipt: true })
            .where(and(
               eq(inquiryMessages.inquiryId, data.inquiryId),
               ne(inquiryMessages.senderId, data.userId),
               eq(inquiryMessages.readReceipt, false)
            ));
         io.to(`inquiry_${data.inquiryId}`).emit("messages_read", { inquiryId: data.inquiryId, byUserId: data.userId });
      } catch(e) {
         console.error(e);
      }
    });

    socket.on("join_user", (uid) => {
      socket.join(`user_${uid}`);
    });
    
    // WebRTC Signaling
    socket.on("receiver_ready", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("receiver_ready", data);
    });
    socket.on("webrtc_offer", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("webrtc_offer", data);
    });
    socket.on("webrtc_answer", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("webrtc_answer", data);
    });
    socket.on("webrtc_ice_candidate", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("webrtc_ice_candidate", data);
    });

    socket.on("whiteboard_draw", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("whiteboard_draw", data);
    });
    
    socket.on("whiteboard_clear", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("whiteboard_clear", data);
    });
    
    socket.on("whiteboard_image", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("whiteboard_image", data);
    });
    socket.on("start_video_call", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("video_call_incoming", data);
    });
    socket.on("accept_video_call", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("video_call_accepted", data);
    });
    socket.on("end_video_call", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("video_call_ended", data);
    });
    socket.on("live_caption", (data) => {
      socket.to(`inquiry_${data.inquiryId}`).emit("live_caption", data);
    });
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  
  app.use((req, res, next) => {
    (req as any).io = io;
    next();
  });

  // Bootstrap Admin User & Products
  try {
    // Hatake KB Team Setup
    const hatakeCompany = 'Hatake KB';
    
    const stefanResult = await db.insert(users).values({
      uid: 'stefan-uid',
      email: 'stefan@hatake.eu',
      displayName: 'Stefan',
      role: 'seller',
      teamRole: 'owner',
      companyName: hatakeCompany,
      country: 'EU',
      verificationStatus: 'verified',
    }).onConflictDoUpdate({
      target: users.uid,
      set: { displayName: 'Stefan', companyName: hatakeCompany, teamRole: 'owner' }
    }).returning();

    const teamOwnerId = stefanResult[0].id;

    await db.insert(users).values([
      {
        uid: 'ernst-uid',
        email: 'ernst@hatake.eu',
        displayName: 'Ernst',
        role: 'admin',
        teamRole: 'catalog_manager',
        companyName: hatakeCompany,
        teamOwnerId: teamOwnerId,
        country: 'EU',
        verificationStatus: 'verified'
      },
      {
        uid: 'zudran-uid',
        email: 'zudran@hatake.eu',
        displayName: 'Zudran',
        role: 'seller',
        teamRole: 'sales_rep',
        companyName: hatakeCompany,
        teamOwnerId: teamOwnerId,
        country: 'EU',
        verificationStatus: 'verified'
      }
    ]).onConflictDoUpdate({
      target: users.uid,
      set: { companyName: hatakeCompany, teamOwnerId: teamOwnerId }
    });
    
    const adminResult = stefanResult; // use stefan as the primary for product seeding
    console.log("Hatake team synced to DB");

    const existingProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
    if (Number(existingProducts[0].count) === 0 && adminResult.length > 0) {
      await db.insert(products).values([
        { sellerId: adminResult[0].id, title: 'Corrugated Shipping Boxes (Bulk)', description: 'Heavy duty shipping boxes ideal for international freight.', moq: 500, originType: 'Direct Factory', leadTimeDays: 14 },
        { sellerId: adminResult[0].id, title: 'Hatake KB Top-Loaders (1000ct)', description: 'Premium protective card sleeves for collectibles.', moq: 10, originType: 'Verified EU Carrier/Warehouse', leadTimeDays: 3 },
        { sellerId: adminResult[0].id, title: 'Industrial Warehouse Shelving Unit', description: 'Heavy duty steel shelving for pallets.', moq: 5, originType: 'Global Distributor', leadTimeDays: 21 },
      ]);
      console.log("Database seeded with initial products.");
    }
  } catch (err) {
    console.error("Failed to bootstrap admin/products:", err);
  }
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Resend Webhook Endpoint for tracking events (email.delivered, email.opened, email.clicked)
  const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      let userProfile = await getUserProfile(req.user.uid);
      if (!userProfile && req.user.email) {
        const byEmail = await db.select().from(users).where(eq(users.email, req.user.email));
        if (byEmail.length > 0) userProfile = byEmail[0];
      }
      if (req.user.email === 'ernst@hatake.eu' || userProfile?.role === 'admin') {
        return next();
      }


      return res.status(403).send("Forbidden: Admins only");
    } catch (e) {
      res.status(500).send("Error checking admin status");
    }
  };

  const requireSeller = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const userProfile = await getUserProfile(req.user.uid);
      if (userProfile?.role !== 'seller' && userProfile?.role !== 'both' && userProfile?.role !== 'admin') {
        return res.status(403).send("Forbidden: Sellers only");
      }
      next();
    } catch (e) {
      res.status(500).send("Error checking seller status");
    }
  };


  // Wishlist API
  app.get("/api-v2/wishlists", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const items = await db.select().from(wishlists).where(eq(wishlists.userId, userProfile.id));
      res.json(items);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api-v2/wishlists/toggle", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { productId } = req.body;
      const userProfile = await getUserProfile(req.user!.uid);
      const existing = await db.select().from(wishlists).where(and(eq(wishlists.userId, userProfile.id), eq(wishlists.productId, productId)));
      
      if (existing.length > 0) {
        await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
        res.json({ saved: false });
      } else {
        await db.insert(wishlists).values({ userId: userProfile.id, productId });
        res.json({ saved: true });
      }
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Categories API
  // LEADS
  
  app.post("/api-v2/feedback", async (req: AuthRequest, res) => {
    try {
      const { type, message } = req.body;
      let userId = null;
      if (req.user) {
         const userProfile = await getUserProfile(req.user.uid);
         if (userProfile) userId = userProfile.id;
      }
      
      const result = await db.insert(feedback).values({
        userId,
        type,
        message,
        status: 'Pending'
      }).returning();
      
      res.json(result[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  // MARKETING
  // AFFILIATES
  app.get("/api-v2/seller/analytics", requireAuth, requireSeller, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user.uid);
      const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
      
      const myProducts = await db.select({ id: products.id }).from(products).where(eq(products.sellerId, teamOwnerId));
      const productIds = myProducts.map(p => p.id);
      
      if (productIds.length === 0) {
         return res.json({
            totalRevenue: 0,
            profileViews: 0,
            conversionRate: 0,
            lineChartData: [
               { name: 'Week 1', views: 0, inquiries: 0 },
               { name: 'Week 2', views: 0, inquiries: 0 },
               { name: 'Week 3', views: 0, inquiries: 0 },
               { name: 'Week 4', views: 0, inquiries: 0 },
            ],
            barChartData: []
         });
      }

      const myInquiries = await db.select().from(inquiries).where(inArray(inquiries.targetProductId, productIds));
      
      let totalRevenue = 0;
      let acceptedOrPaidCount = 0;
      let totalInquiriesCount = myInquiries.length;
      
      myInquiries.forEach(inq => {
         if (['Accepted', 'Paid', 'Escrow Funded', 'Escrow Released'].includes(inq.status || '') || ['Paid', 'Escrow Funded', 'Escrow Released'].includes(inq.paymentStatus || '')) {
            acceptedOrPaidCount++;
            if (inq.targetBudget) {
               totalRevenue += parseFloat(inq.targetBudget.toString());
            }
         }
      });
      
      const conversionRate = totalInquiriesCount > 0 ? (acceptedOrPaidCount / totalInquiriesCount) * 100 : 0;
      
      let negotiatingCount = 0;
      myInquiries.forEach(inq => {
         if (inq.status === 'Under Negotiation' || inq.status === 'Pending') negotiatingCount++;
      });
      
      const funnelData = [
         { name: 'Initiated', value: totalInquiriesCount, fill: '#6366f1' },
         { name: 'Negotiating', value: negotiatingCount, fill: '#f59e0b' },
         { name: 'Accepted', value: acceptedOrPaidCount, fill: '#10b981' }
      ];
      
      // We will generate the 4 weeks line chart data based on inquiries creation date
      const now = new Date();
      const week1Start = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      const week2Start = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      const week3Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const week4Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const w1 = myInquiries.filter(i => i.createdAt >= week1Start && i.createdAt < week2Start).length;
      const w2 = myInquiries.filter(i => i.createdAt >= week2Start && i.createdAt < week3Start).length;
      const w3 = myInquiries.filter(i => i.createdAt >= week3Start && i.createdAt < week4Start).length;
      const w4 = myInquiries.filter(i => i.createdAt >= week4Start).length;

      const lineChartData = [
         { name: 'Week 1', views: Math.floor(Math.random() * 10 + w1 * 2), inquiries: w1 },
         { name: 'Week 2', views: Math.floor(Math.random() * 10 + w2 * 2), inquiries: w2 },
         { name: 'Week 3', views: Math.floor(Math.random() * 10 + w3 * 2), inquiries: w3 },
         { name: 'Week 4', views: Math.floor(Math.random() * 10 + w4 * 2), inquiries: w4 },
      ];

      // Bar chart data for Revenue by Category
      // We need to fetch product categories
      const allProductsData = await db.select({
         id: products.id,
         categoryId: products.categoryId,
         unitCost: products.unitCost,
         stockQuantity: products.stockQuantity
      }).from(products).where(eq(products.sellerId, teamOwnerId));

      const categoriesData = await db.select().from(categories);
      const categoryMap = new Map();
      categoriesData.forEach(c => categoryMap.set(c.id, c.name));

      const revByCategory = new Map();
      allProductsData.forEach(p => {
         const catName = p.categoryId ? categoryMap.get(p.categoryId) || 'Unknown' : 'Unknown';
         const val = parseFloat(p.unitCost || '0') * parseInt(String(p.stockQuantity || 0));
         revByCategory.set(catName, (revByCategory.get(catName) || 0) + val);
      });

      const barChartData = Array.from(revByCategory.entries()).map(([name, revenue]) => ({ name, revenue }));

      res.json({
         totalRevenue,
         profileViews: w1 + w2 + w3 + w4 + 10,
         conversionRate,
         lineChartData,
         barChartData,
         funnelData
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api-v2/seller/products", requireAuth, requireSeller, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
      const myProducts = await db.select({
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
          approvalStatus: products.approvalStatus,
          images: products.images,
          createdAt: products.createdAt
      }).from(products).where(eq(products.sellerId, teamOwnerId)).orderBy(desc(products.createdAt));
      res.json(myProducts);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  
  app.post("/api-v2/seller/products", requireAuth, requireSeller, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
      
      const { title, description, originType, moq, tieredPricing, leadTimeDays, shippingOptions, certifications, images, stockQuantity, unitCost, categoryId, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;
      const embedding = await generateEmbedding(`${title} ${description} ${originType || 'Direct Factory'}`);
      
      const parsedMoq = parseInt(moq, 10);
      const parsedLeadTime = parseInt(leadTimeDays, 10);
      const parsedStock = parseInt(stockQuantity, 10);
      const parsedCost = parseFloat(unitCost);
      const parsedYear = parseInt(cardYear, 10);

      const [newProduct] = await db.insert(products).values({
        embedding,
        sellerId: teamOwnerId,
        title,
        description,
        moq: isNaN(parsedMoq) ? 1 : parsedMoq,
        tieredPricing: tieredPricing || null,
        originType: originType || 'Direct Factory',
        leadTimeDays: isNaN(parsedLeadTime) ? 7 : parsedLeadTime,
        shippingOptions: shippingOptions || [],
        certifications: certifications || [],
        images: images || [],
        stockQuantity: isNaN(parsedStock) ? 0 : parsedStock,
        unitCost: isNaN(parsedCost) ? 0 : parsedCost,
        categoryId: categoryId || null,
        productType: productType || 'sealed',
        gradingCompany: gradingCompany || null,
        grade: grade || null,
        certNumber: certNumber || null,
        cardYear: isNaN(parsedYear) ? null : parsedYear,
        cardSet: cardSet || null,
        cardNumber: cardNumber || null,
        cardVariant: cardVariant || null,
      }).returning();
      
      res.json(newProduct);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api-v2/seller/products/bulk", requireAuth, requireSeller, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
      const { products: newProducts } = req.body;

      if (!Array.isArray(newProducts)) return res.status(400).json({ error: "Expected an array of products" });

      const insertData = await Promise.all(newProducts.map(async (p: any) => {
        const { title, description, originType, moq, tieredPricing, leadTimeDays, shippingOptions, certifications, images, stockQuantity, unitCost, categoryId, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = p;
        const embedding = await generateEmbedding(`${title} ${description} ${originType || 'Direct Factory'}`);
        
        const parsedMoq = parseInt(moq, 10);
        const parsedLeadTime = parseInt(leadTimeDays, 10);
        const parsedStock = parseInt(stockQuantity, 10);
        const parsedCost = parseFloat(unitCost);
        const parsedYear = parseInt(cardYear, 10);

        return {
          embedding,
          sellerId: teamOwnerId,
          title,
          description,
          moq: isNaN(parsedMoq) ? 1 : parsedMoq,
          tieredPricing: tieredPricing || null,
          originType: originType || 'Direct Factory',
          leadTimeDays: isNaN(parsedLeadTime) ? 7 : parsedLeadTime,
          shippingOptions: shippingOptions || [],
          certifications: certifications || [],
          images: images || [],
          stockQuantity: isNaN(parsedStock) ? 0 : parsedStock,
          unitCost: isNaN(parsedCost) ? 0 : parsedCost,
          categoryId: categoryId || null,
          productType: productType || 'sealed',
          gradingCompany: gradingCompany || null,
          grade: grade || null,
          certNumber: certNumber || null,
          cardYear: isNaN(parsedYear) ? null : parsedYear,
          cardSet: cardSet || null,
          cardNumber: cardNumber || null,
          cardVariant: cardVariant || null,
        };
      }));
      
      const result = await db.insert(products).values(insertData).returning();
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api-v2/seller/products/:id", requireAuth, requireSeller, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const productId = parseInt(req.params.id, 10);
      
      const existing = await db.select().from(products).where(and(eq(products.id, productId), eq(products.sellerId, userProfile.teamOwnerId || userProfile.id)));
      if (!existing.length) return res.status(403).json({ error: "Not authorized" });

      const { title, description, moq, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;
      const embedding = await generateEmbedding(`${title} ${description} ${originType}`);
      await db.update(products).set({
        embedding,
        title, description, moq, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant,
        
      }).where(eq(products.id, productId));
      
            res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api-v2/seller/products/:id", requireAuth, requireSeller, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const productId = parseInt(req.params.id, 10);
      
      const existing = await db.select().from(products).where(and(eq(products.id, productId), eq(products.sellerId, userProfile.teamOwnerId || userProfile.id)));
      if (!existing.length) return res.status(403).json({ error: "Not authorized" });

      await db.delete(inquiries).where(eq(inquiries.targetProductId, productId));
      await db.delete(products).where(eq(products.id, productId));
      
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      if (!res.headersSent) {
        return res.status(500).json({ error: err.message });
      }
    }
  });

  app.post("/api-v2/upload", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const { imageBase64, filename } = req.body;
      
      if (!imageBase64) return res.status(400).send("No image provided");

      const docRef = await adminDb.collection("uploaded_images").add({
        data: imageBase64,
        uploader: req.user.uid,
        createdAt: new Date()
      });

      res.json({ url: `/api/images/${docRef.id}${filename ? "/" + encodeURIComponent(filename) : ""}` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api-v2/images/:id/:filename?", async (req, res) => {
    try {
      const doc = await adminDb.collection("uploaded_images").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).send("Not found");
      const dataUrl = doc.data()?.data;
      if (!dataUrl) return res.status(404).send("No image data");

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).send("Invalid image format");
      }

      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      res.set('Content-Type', type);
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(buffer);
    } catch (e) {
      console.error(e);
      res.status(500).send("Error fetching image");
    }
  });
  app.get("/api-v2/invitations/validate", async (req, res) => {
    try {
       const token = req.query.token as string;
       if (!token) return res.status(400).json({ error: "Missing token" });
       const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
       const lead = await db.select().from(leads).where(eq(leads.inviteTokenHash, tokenHash)).limit(1);
       if (lead.length === 0) return res.status(404).json({ error: "Invalid invitation" });
       if (lead[0].status === 'recruited') return res.status(400).json({ error: "Invitation already redeemed" });
       
       res.json({ email: lead[0].email, companyName: lead[0].companyName });
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  });

  
  app.get("/api-v2/store/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const storeUser = await db.select().from(users).where(eq(users.storeSlug, slug)).limit(1);
      if (storeUser.length === 0) return res.status(404).json({ error: "Store not found" });
      
      const store = storeUser[0];
      const storeProducts = await db.select().from(products).where(eq(products.sellerId, store.id));
      
      res.json({
        store: {
          id: store.id,
          companyName: store.companyName,
          country: store.country,
          storeBannerUrl: store.storeBannerUrl,
          storePolicies: store.storePolicies
        },
        products: storeProducts
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.get("/api-v2/affiliates/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      if (!userProfile) return res.status(404).send("User not found");
      
      // Auto-generate referral code if missing
      let refCode = userProfile.referralCode;
      if (!refCode) {
        refCode = "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        await db.update(users).set({ referralCode: refCode }).where(eq(users.id, userProfile.id));
      }
      
      // Referrals stats
      const referredUsers = await db.select().from(users).where(eq(users.referredById, userProfile.id));
      const referredLeads = await db.select().from(leads).where(eq(leads.referredById, userProfile.id));
      
      // Calculate GMV for referred users (simplified: all Paid/Escrow released inquiries by these users)
      let totalGmv = 0;
      if (referredUsers.length > 0) {
        const referredIds = referredUsers.map(u => u.id);
        const theirPurchases = await db.select().from(inquiries).where(inArray(inquiries.buyerId, referredIds));
        theirPurchases.forEach(p => {
          if (p.paymentStatus === 'Paid' || p.paymentStatus === 'Escrow Released') {
            totalGmv += (Number(p.quantity) * Number(p.targetBudget));
          }
        });
      }
      
      res.json({
        referralCode: refCode,
        totalSignups: referredUsers.length,
        totalLeads: referredLeads.length,
        totalGmv: totalGmv,
        commissionEarned: totalGmv * 0.01 // 1% commission
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api-v2/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const user = await getUserProfile(req.user.uid);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  
  app.get("/api-v2/company/:id", async (req, res) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      const company = await db.select({
        id: users.id,
        companyName: users.companyName,
        country: users.country,
        website: users.website,
        aboutUs: users.aboutUs,
        socialLinks: users.socialLinks,
        portfolio: users.portfolio,
        profilePictureUrl: users.profilePictureUrl,
        bannerUrl: users.bannerUrl,
        createdAt: users.createdAt,
        teamOwnerId: users.teamOwnerId,
        role: users.role,
        verificationStatus: users.verificationStatus,
      }).from(users).where(eq(users.id, companyId)).limit(1);

      if (!company.length) return res.status(404).json({ error: "Company not found" });

      const teamMembers = await db.select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        teamRole: users.teamRole
      }).from(users).where(
        or(
          eq(users.teamOwnerId, companyId),
          eq(users.teamOwnerId, company[0].teamOwnerId || -1),
          eq(users.id, companyId),
          eq(users.id, company[0].teamOwnerId || -1)
        )
      );

      const companyProducts = await db.select().from(products).where(eq(products.sellerId, companyId));

      res.json({
        company: company[0],
        teamMembers,
        products: companyProducts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api-v2/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const user = await updateUserProfile(req.user.uid, req.body);
      res.json(user);
    } catch (err: any) {
      console.error("SERVER ERROR:", err);
      // Return the full error cause for debugging
      const rootCause = err.cause?.cause?.message || err.cause?.message || err.toString();
      res.status(500).json({ error: err.message, cause: rootCause });
    }
  });

  
  app.patch("/api-v2/users/team/:id/role", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      if (userProfile.id !== userProfile.teamOwnerId && userProfile.teamOwnerId !== null) {
         return res.status(403).json({ error: "Only team owner can change roles" });
      }
      
      const targetUserId = parseInt(req.params.id, 10);
      const { teamRole } = req.body;
      
      await db.update(users).set({ teamRole }).where(eq(users.id, targetUserId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api-v2/users/team", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      if (!userProfile) return res.status(404).send("User not found");

      const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
      
      let ownerProfile = userProfile;
      if (userProfile.teamOwnerId) {
         const ownerRes = await db.select().from(users).where(eq(users.id, userProfile.teamOwnerId));
         if (ownerRes.length > 0) ownerProfile = ownerRes[0];
      }

      let inviteCode = ownerProfile.inviteCode;
      if (!inviteCode) {
         // Generate a random secret code for the owner
         inviteCode = "SEC-" + Math.random().toString(36).substring(2, 10).toUpperCase();
         await db.update(users).set({ inviteCode }).where(eq(users.id, ownerProfile.id));
      }

      // Fetch all users that belong to this team
      const teamMembers = await db.select().from(users).where(
         or(eq(users.id, teamOwnerId), eq(users.teamOwnerId, teamOwnerId))
      );

      res.json({
         inviteCode,
         teamOwnerId,
         members: teamMembers
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api-v2/users/team/join", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Invite code required" });

      const userProfile = await getUserProfile(req.user!.uid);
      if (!userProfile) return res.status(404).json({ error: "User not found" });

      // Find the team owner with this code
      const ownerQuery = await db.select().from(users).where(eq(users.inviteCode, code));
      if (ownerQuery.length === 0) {
         return res.status(404).json({ error: "Invalid invite code" });
      }

      const owner = ownerQuery[0];
      if (owner.id === userProfile.id) {
         return res.status(400).json({ error: "You cannot join your own team" });
      }

      // Update the current user to belong to this team
      const updatedUser = await db.update(users).set({
         teamOwnerId: owner.id,
         companyName: owner.companyName,
         role: owner.role, // Inherit role
         country: owner.country
      }).where(eq(users.id, userProfile.id)).returning();

      res.json({ success: true, user: updatedUser[0] });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });


    app.get("/api-v2/marketplace/sneak-peek", async (req, res) => {
    try {
      const topCategories = await db.select().from(categories).where(sql`parent_id IS NULL`).orderBy(categories.sortOrder);
      const result = [];
      for (const cat of topCategories) {
        const subcats = await db.select().from(categories).where(eq(categories.parentId, cat.id)).orderBy(categories.sortOrder);
        
        const rootDescIds = await getDescendantCategoryIds(db, cat.id);
        const rootCountRes = await db.select({ count: sql`count(*)` }).from(products).where(and(inArray(products.categoryId, rootDescIds), eq(products.approvalStatus, 'approved')));
        const totalProducts = Number(rootCountRes[0].count);
        
        if (totalProducts === 0 && !cat.isVisibleIfEmpty) {
          continue;
        }
        
        const allProdsQuery = await db.select({
            product: products,
            seller: {
              id: users.id,
              companyName: users.companyName,
              verificationStatus: users.verificationStatus
            }
          })
          .from(products)
          .leftJoin(users, eq(products.sellerId, users.id))
          .where(and(inArray(products.categoryId, rootDescIds), eq(products.approvalStatus, 'approved')))
          .orderBy(desc(products.createdAt));

        const sellerMap = new Map();
        for (const item of allProdsQuery) {
           if (!item.seller) continue;
           if (!sellerMap.has(item.seller.id)) {
              sellerMap.set(item.seller.id, { seller: item.seller, products: [] });
           }
           const group = sellerMap.get(item.seller.id);
           if (group.products.length < 4) { // Limit to 4 per seller
              group.products.push(item);
           }
        }
        const groups = Array.from(sellerMap.values());

        const subcatsWithCounts = await Promise.all(subcats.map(async (sub) => {
           const descIds = await getDescendantCategoryIds(db, sub.id);
           const countRes = await db.select({ count: sql`count(*)` }).from(products).where(and(inArray(products.categoryId, descIds), eq(products.approvalStatus, 'approved')));
           const c = Number(countRes[0].count);
           return { ...sub, productCount: c };
        }));

        const filteredSubcats = subcatsWithCounts.filter(sub => sub.productCount > 0 || sub.isVisibleIfEmpty);
        
        result.push({
          category: cat,
          subcategories: filteredSubcats,
          groups: groups
        });
      }
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api-v2/insights", async (req, res) => {
    try {
      const { timeRange = '30d', category = 'all' } = req.query;
      
      let days = 30;
      if (timeRange === '7d') days = 7;
      if (timeRange === '90d') days = 90;
      if (timeRange === '1y') days = 365;
      if (timeRange === 'all') days = 3650;
      
      const categoryId = category === 'all' ? null : parseInt(category as string, 10);

      const usersData = await db.select({ role: users.role, id: users.id, displayName: users.displayName, companyName: users.companyName }).from(users);
      const activeBuyers = usersData.filter(u => u.role === 'buyer').length || 1;
      const activeSellers = usersData.filter(u => u.role === 'seller' || u.role === 'admin').length || 1;

      const inquiriesData = await db.select({ 
         quantity: inquiries.quantity, 
         targetBudget: inquiries.targetBudget,
         createdAt: inquiries.createdAt,
         buyerId: inquiries.buyerId,
         productId: inquiries.targetProductId
      }).from(inquiries);

      const productsData = await db.select({
         id: products.id,
         categoryId: products.categoryId,
         unitCost: products.unitCost
      }).from(products);
      
      const categoryMap = await db.select().from(categories);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      let filteredInquiries = inquiriesData.filter(inq => {
         if (!inq.createdAt) return false;
         const inqDate = new Date(inq.createdAt);
         return inqDate >= cutoff;
      });

      if (categoryId) {
         const queue = [categoryId];
         const validCats = new Set<number>();
         while(queue.length > 0) {
            const cur = queue.pop();
            if (cur !== undefined && !validCats.has(cur)) {
               validCats.add(cur);
               const children = categoryMap.filter(c => c.parentId === cur).map(c => c.id);
               queue.push(...children);
            }
         }
         
         const validProductIds = new Set(productsData.filter(p => p.categoryId && validCats.has(p.categoryId)).map(p => p.id));
         filteredInquiries = filteredInquiries.filter(inq => inq.productId && validProductIds.has(inq.productId));
      }
      
      const totalRfqVolume = filteredInquiries.reduce((acc, curr) => {
         return acc + (curr.quantity * (parseFloat(curr.targetBudget as string) || 0));
      }, 0);

      // 1. Volume Over Time
      const numBuckets = Math.min(days, 30);
      const volumeOverTime = Array.from({ length: numBuckets }).map((_, i) => {
         const date = new Date();
         date.setDate(date.getDate() - (numBuckets - 1 - i) * (days / numBuckets));
         const nextDate = new Date(date);
         nextDate.setDate(date.getDate() + (days / numBuckets));

         const vol = filteredInquiries.filter(inq => {
            const inqDate = new Date(inq.createdAt!);
            return inqDate >= date && inqDate < nextDate;
         }).reduce((acc, curr) => acc + (curr.quantity * (parseFloat(curr.targetBudget as string) || 0)), 0);

         return {
           date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
           volume: vol
         }
      });

      // 2. Price Volatility Index
      const priceVolatility = Array.from({ length: numBuckets }).map((_, i) => {
         const date = new Date();
         date.setDate(date.getDate() - (numBuckets - 1 - i) * (days / numBuckets));
         const nextDate = new Date(date);
         nextDate.setDate(date.getDate() + (days / numBuckets));

         const dayCount = filteredInquiries.filter(inq => {
            const inqDate = new Date(inq.createdAt!);
            return inqDate >= date && inqDate < nextDate;
         }).length;
         
         return {
           date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
           index: 100 + (dayCount * 5) + Math.random() * 5
         }
      });

      // 3. Trending Categories
      const trendingMap: Record<string, number> = {};
      filteredInquiries.forEach(inq => {
         if (inq.productId) {
            const p = productsData.find(pr => pr.id === inq.productId);
            if (p && p.categoryId) {
               const cat = categoryMap.find(c => c.id === p.categoryId);
               if (cat) {
                  trendingMap[cat.name] = (trendingMap[cat.name] || 0) + (inq.quantity * (parseFloat(inq.targetBudget as string) || 0));
               }
            }
         }
      });
      // Fallback logic if trending is empty
      if (Object.keys(trendingMap).length === 0) {
         productsData.forEach(p => {
            const cat = categoryMap.find(c => c.id === p.categoryId);
            if (cat) {
               trendingMap[cat.name] = (trendingMap[cat.name] || 0) + (parseFloat(p.unitCost as string) || 50) * 10;
            }
         });
      }
      
      const trendingCategories = Object.keys(trendingMap).map(k => ({
         name: k,
         volume: trendingMap[k]
      })).sort((a, b) => b.volume - a.volume).slice(0, 5);

      if (trendingCategories.length === 0) {
         trendingCategories.push({ name: "Wholesale", volume: 1000 });
      }

      // 4. Top Buyers
      const buyerVolumeMap: Record<number, number> = {};
      filteredInquiries.forEach(inq => {
         if (inq.buyerId) {
            buyerVolumeMap[inq.buyerId] = (buyerVolumeMap[inq.buyerId] || 0) + (inq.quantity * (parseFloat(inq.targetBudget as string) || 0));
         }
      });
      const topBuyers = Object.entries(buyerVolumeMap)
         .sort((a, b) => b[1] - a[1])
         .slice(0, 5)
         .map(([buyerId, volume]) => {
             const user = usersData.find(u => u.id === parseInt(buyerId));
             return {
                 name: user?.companyName || user?.displayName || `User #${buyerId}`,
                 volume
             };
         });

      const insights = {
        trendingCategories,
        priceVolatility,
        volumeOverTime,
        topBuyers,
        platformStats: {
          activeBuyers,
          activeSellers,
          totalRfqVolume
        }
      };
      res.json(insights);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  // AI Sourcing Engine
  app.post("/api-v2/sourcing/ai-match", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const { prompt } = req.body;

      const userProfile = await getUserProfile(req.user.uid);
      if (!userProfile) return res.status(404).send("User profile missing");

      // We'll construct a simple prompt to match their requirements against dummy products
      // or to output a structured JSON representing the RFQ.
      const aiPrompt = `You are an AI sourcing engine for a B2B wholesale platform. 
      The user wants to source: "${prompt}"
      
      Extract the requirements and return a JSON object with:
      - lineItems: array of { category: string, suggestedTitle: string, targetQuantity: number, targetBudgetPerUnit: number, targetBudgetTotal: number }
      - totalTargetBudget: number
      - shippingDestination: string
      - originPreference: string (e.g. EU, Asia, Any)
      - notes: string (any specific custom requirements mentioned)
      `;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: aiPrompt,
        config: {
            responseMimeType: "application/json",
        }
      });

      const parsed = JSON.parse(aiResponse.text || "{}");

      // Use pgvector to instantly match actual DB products against the user's prompt
      let matchedProducts = [];
      try {
         const queryEmbedding = await generateEmbedding(prompt);
         if (queryEmbedding) {
            const vectorString = '[' + queryEmbedding.join(',') + ']';
            matchedProducts = await db.select({
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
              seller: { id: users.id, companyName: users.companyName, country: users.country }
            })
            .from(products)
            .leftJoin(users, eq(products.sellerId, users.id))
            .where(and(eq(products.approvalStatus, 'approved'), isNotNull(products.embedding)))
            .orderBy(sql`${products.embedding} <-> ${vectorString}`)
            .limit(4);
         }
      } catch (e) {
         console.error("Vector matching failed:", e);
      }
      
      res.json({ matchResult: parsed, matchedProducts });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "AI matching failed", details: err.message });
    }
  });
  
  app.post("/api-v2/translate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) return res.status(400).json({ error: "Missing text or target language" });
      
      const aiResponse = await ai.models.generateContent({
         model: "gemini-2.5-flash",
         contents: `Translate the following text to ${targetLanguage}. Only return the raw translated text, without any conversational wrapping, markdown, or quotes.\n\nText: ${text}`
      });
      
      res.json({ translation: aiResponse.text?.trim() });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });


  app.post("/api-v2/seller/:id/contact", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const userProfile = await getUserProfile(req.user.uid);
      if (!userProfile) return res.status(404).send("User missing");

      const sellerId = parseInt(req.params.id, 10);
      const sellerQuery = await db.select().from(users).where(eq(users.id, sellerId));
      if (sellerQuery.length === 0) return res.status(404).send("Seller not found");
      const sellerProfile = sellerQuery[0];

      // Find or create "General Inquiry" product for this seller
      let product;
      const productQuery = await db.select().from(products).where(and(eq(products.sellerId, sellerId), eq(products.title, "General Inquiry")));
      if (productQuery.length > 0) {
        product = productQuery[0];
      } else {
        const result = await db.insert(products).values({
          sellerId: sellerId,
          title: "General Inquiry",
          description: "Direct message with the supplier",
          moq: 1,
          approvalStatus: 'approved',
          originType: 'Direct Factory',
          leadTimeDays: 1,
          unitCost: "0"
        }).returning();
        product = result[0];
      }

      const result = await db.insert(inquiries).values({
        buyerId: userProfile.id,
        targetProductId: product.id,
        quantity: 1,
        status: 'Pending',
      }).returning();
      
      const newInquiry = result[0];

      // Setup Firestore inquiry & notification
      await adminDb.collection('inquiries').doc(newInquiry.id.toString()).set({
        id: newInquiry.id,
        buyerId: userProfile.id,
        buyerUid: req.user.uid,
        buyerName: userProfile.displayName,
        buyerCompany: userProfile.companyName,
        targetProductId: product.id,
        productTitle: product.title,
        sellerId: sellerId,
        sellerUid: sellerProfile.uid,
        sellerCompany: sellerProfile.companyName,
        status: newInquiry.status,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      const msgData = {
        senderId: userProfile.id,
        messageContent: "I would like to get in touch.",
        createdAt: FieldValue.serverTimestamp()
      };
      await adminDb.collection('inquiries').doc(newInquiry.id.toString()).collection('messages').add(msgData);
      
      await db.insert(inquiryMessages).values({
        inquiryId: newInquiry.id,
        senderId: userProfile.id,
        messageContent: "I would like to get in touch."
      });

      // Send Resend email
      try {
        await resend.emails.send({
          from: "Hatake <onboarding@resend.dev>",
          to: sellerProfile.email,
          subject: `New Message from ${userProfile.companyName || userProfile.displayName}`,
          html: `<p>You have received a new message from ${userProfile.companyName || userProfile.displayName}.</p><p>Please log in to your dashboard to view and reply.</p>`
        });
      } catch (emailErr) {
        console.error("Email failed:", emailErr);
      }

      res.json(newInquiry);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api-v2/agora-token", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const { channelName } = req.body;
      if (!channelName) return res.status(400).json({ error: "channelName is required" });
      
      const appId = process.env.VITE_AGORA_APP_ID || process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";
      
      if (!appId) return res.status(400).json({ error: "Agora App ID is missing" });
      
      const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
      const uid = 0; // 0 allows Agora to assign a dynamic integer UID
      const role = RtcRole.PUBLISHER;
      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
      
      if (!appCertificate) {
         // If they have no cert, they can't generate a token.
         return res.json({ appId, token: null });
      }
      
      const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
      res.json({ appId, token });
    } catch (e: any) {
      console.error("Agora Token Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  
  app.post("/api-v2/logistics/estimate", async (req, res) => {
    try {
      const { quantity, currentPrice, destination } = req.body;
      if (!quantity || !currentPrice) return res.status(400).json({ error: "Missing payload" });

      const ep = getEasyPost();

      const destAddresses: Record<string, any> = {
        'EU': { country: 'DE', zip: '10115', city: 'Berlin' },
        'US': { country: 'US', zip: '10001', city: 'New York', state: 'NY' },
        'UK': { country: 'GB', zip: 'E1 6AN', city: 'London' },
        'JP': { country: 'JP', zip: '100-0001', city: 'Tokyo' }
      };
      const toAddressData = destAddresses[destination] || destAddresses['US'];

      const fromAddress = await ep.Address.create({
        street1: '123 Seller St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'US',
      });

      const toAddress = await ep.Address.create(toAddressData);

      // Assume 0.5kg (17.6oz) per unit
      const totalWeightOz = quantity * 17.6;

      const parcel = await ep.Parcel.create({ weight: totalWeightOz });

      const customsItem = await ep.CustomsItem.create({
        description: 'TCG Wholesale Products',
        quantity: quantity,
        value: currentPrice,
        weight: 17.6,
        origin_country: 'US',
        hs_tariff_number: '9503.00.00'
      });

      const customsInfo = await ep.CustomsInfo.create({
        customs_certify: true,
        customs_signer: 'Hatake Shop',
        contents_type: 'merchandise',
        contents_explanation: 'B2B Wholesale',
        restriction_type: 'none',
        non_delivery_option: 'return',
        customs_items: [customsItem]
      });

      const shipment = await ep.Shipment.create({
        to_address: toAddress,
        from_address: fromAddress,
        parcel: parcel,
        customs_info: customsInfo
      });

      if (!shipment.rates || shipment.rates.length === 0) {
        throw new Error("No rates returned by carrier");
      }

      const rate = shipment.rates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];

      const VAT_RATES: Record<string, number> = { 'EU': 0.21, 'US': 0.00, 'UK': 0.20, 'JP': 0.10 };
      const DUTY_RATES: Record<string, number> = { 'EU': 0.047, 'US': 0.00, 'UK': 0.04, 'JP': 0.00 };

      const baseTotal = currentPrice * quantity;
      const freightCost = parseFloat(rate.rate);
      const freightMethod = rate.carrier + ' ' + rate.service;

      const dutyRate = DUTY_RATES[destination] || 0;
      const dutyCost = baseTotal * dutyRate;

      const vatRate = VAT_RATES[destination] || 0;
      const vatCost = (baseTotal + freightCost + dutyCost) * vatRate;

      const totalLanded = baseTotal + freightCost + dutyCost + vatCost;
      const landedPerUnit = totalLanded / quantity;

      res.json({
        baseTotal,
        freightMethod,
        freightCost,
        dutyRate,
        dutyCost,
        vatRate,
        vatCost,
        totalLanded,
        landedPerUnit,
        currency: rate.currency || 'USD'
      });
    } catch (error: any) {
      console.error("EasyPost Error:", error);
      res.status(500).json({ error: error.message || "Failed to calculate live rates" });
    }
  });
  app.post("/api-v2/cart/rfq", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const userProfile = await getUserProfile(req.user.uid);
      if (!userProfile) return res.status(404).send("User missing");

      const { items } = req.body;
      if (!items || !items.length) {
        return res.status(400).json({ error: "No items in cart" });
      }

      // Group by supplierId
      const grouped = items.reduce((acc: any, item: any) => {
        const sid = item.supplierId;
        if (!acc[sid]) acc[sid] = [];
        acc[sid].push(item.productId);
        return acc;
      }, {});

      const createdInquiries = [];

      for (const supplierId of Object.keys(grouped)) {
        const productIds = grouped[supplierId];
        
        // Create inquiry
        const result = await db.insert(inquiries).values({
          buyerId: userProfile.id,
          targetSellerId: parseInt(supplierId, 10),
          quantity: 1, // Default or compute from items if they had quantity
          status: 'Draft'
        }).returning();
        
        const newInquiry = result[0];
        
        // Create inquiryMessage with product IDs
        await db.insert(inquiryMessages).values({
          inquiryId: newInquiry.id,
          senderId: userProfile.id,
          messageContent: `Requested bulk quote for product IDs: ${productIds.join(', ')}`,
          isOfficialQuote: false
        });

        // Add to firestore for notifications
        try {
          const seller = await db.query.users.findFirst({
            where: eq(users.id, parseInt(supplierId, 10))
          });
          if (seller) {
            await adminDb.collection('inquiries').doc(newInquiry.id.toString()).set({
              buyerUid: req.user.uid,
              sellerUid: seller.uid
            });
            await adminDb.collection('users').doc(seller.uid).collection('notifications').add({
              title: 'New Cart RFQ',
              body: `You have received a new bulk quote request for multiple products.`,
              read: false,
              createdAt: new Date(),
              link: `/rfq/${newInquiry.id}`
            });
          }
        } catch(e) {
          console.error("Firestore error creating cart rfq:", e);
        }

        createdInquiries.push(newInquiry);
      }

      res.json({ success: true, inquiries: createdInquiries });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api-v2/inquiries", requireAuth, async (req: AuthRequest, res) => {
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
      
      // Setup Firestore inquiry & notification
      if (targetProductId) {
        const productInfo = await db.select({ sellerUid: users.uid })
          .from(products)
          .innerJoin(users, eq(products.sellerId, users.id))
          .where(eq(products.id, targetProductId));
          
        if (productInfo.length > 0) {
          const sellerUid = productInfo[0].sellerUid;
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
        }
      }

      res.json(newInquiry);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api-v2/inquiries", requireAuth, async (req: AuthRequest, res) => {
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


  app.post("/api-v2/reviews", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const userProfile = await getUserProfile(req.user.uid);
      if (!userProfile) return res.status(404).send("User missing");
      
      const { targetUserId, targetProductId, inquiryId, rating, title, comment } = req.body;

      // Ensure the buyer has completed a verified transaction with this seller or product
      // We look for inquiries with paymentStatus = 'Escrow Released' or 'Paid'
      let verifiedTransactionQuery;
      
      if (targetProductId) {
         verifiedTransactionQuery = await db.select().from(inquiries)
           .where(and(
             eq(inquiries.buyerId, userProfile.id),
             eq(inquiries.targetProductId, targetProductId),
             inArray(inquiries.paymentStatus, ['Paid', 'Escrow Released', 'Escrow Funded'])
           ));
      } else if (targetUserId) {
         // Join products to check seller
         verifiedTransactionQuery = await db.select().from(inquiries)
           .innerJoin(products, eq(inquiries.targetProductId, products.id))
           .where(and(
             eq(inquiries.buyerId, userProfile.id),
             eq(products.sellerId, targetUserId),
             inArray(inquiries.paymentStatus, ['Paid', 'Escrow Released', 'Escrow Funded'])
           ));
      }

      if (!verifiedTransactionQuery || verifiedTransactionQuery.length === 0) {
         return res.status(403).json({ error: "You can only review suppliers after completing a verified transaction." });
      }

      const [review] = await db.insert(reviews).values({
        reviewerId: userProfile.id,
        targetUserId,
        targetProductId,
        inquiryId,
        rating,
        title,
        comment
      }).returning();
      res.json(review);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  app.get("/api-v2/users/:id/reviews", async (req, res) => {
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

  app.post("/api-v2/inquiries/:id/escrow/release", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!req.user) return res.status(401).send("Unauthorized");
        const userProfile = await getUserProfile(req.user.uid);
        
        const id = parseInt(req.params.id);
        const inquiry = await db.query.inquiries.findFirst({ where: eq(inquiries.id, id) });
        if (!inquiry || inquiry.buyerId !== userProfile.id) return res.status(403).json({ error: "Unauthorized" });

        if (inquiry.paymentStatus !== 'Escrow Funded') {
            return res.status(400).json({ error: "Cannot release escrow from current status" });
        }

        // Fetch seller details for stripeAccountId
        const productInfo = await db.select({ sellerId: products.sellerId, unitCost: products.unitCost }).from(products).where(eq(products.id, inquiry.targetProductId!));
        if (productInfo.length > 0) {
            const sellerInfo = await db.select({ stripeAccountId: users.stripeAccountId }).from(users).where(eq(users.id, productInfo[0].sellerId));
            
            // Execute Stripe Transfer to the seller (Mocking the transfer if stripe is not fully setup, but putting code)
            const unitCost = Number(productInfo[0].unitCost) || 0;
            const totalAmount = Math.round(unitCost * inquiry.quantity * 100);
            const platformFee = Math.round(totalAmount * 0.05);
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
            
        // Emit socket event to update seller UI
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

  app.get("/api-v2/inquiries/:id/invoice", requireAuth, async (req: AuthRequest, res) => {
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

  
  app.get("/api-v2/inquiries/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      const inquiryId = parseInt(req.params.id, 10);
      const userProfile = await getUserProfile(req.user.uid);
      if (!userProfile) return res.status(404).send("User missing");

      // Verify access
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


  
  app.post("/api-v2/inquiries/:id/messages", requireAuth, async (req: AuthRequest, res) => {
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
      
      // Emit to socket
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
  
  
  app.post("/api-v2/inquiries/:id/accept-quote", requireAuth, async (req: AuthRequest, res) => {
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
      
      // Update message in postgres
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

  app.post("/api-v2/inquiries/:id/sign", requireAuth, async (req: AuthRequest, res) => {
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
      // if (isBuyer) updateData.buyerSignature = signature;
      // if (isSeller) updateData.sellerSignature = signature;
      // await db.update(inquiries).set(updateData).where(eq(inquiries.id, inquiryId));
      
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

  app.post("/api-v2/inquiries/:id/accept", requireAuth, async (req: AuthRequest, res) => {
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
      
      // Mark as accepted
      await db.update(inquiries).set({ status: 'Accepted' }).where(eq(inquiries.id, inquiryId));
      
      // Deduct stock
      const newStock = Math.max(0, (productInfo[0].stockQuantity || 0) - inq.quantity);
      await db.update(products).set({ stockQuantity: newStock }).where(eq(products.id, inq.targetProductId!));
      
      // Emit socket event
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

  app.post("/api-v2/inquiries/:id/decline", requireAuth, async (req: AuthRequest, res) => {
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
      
      // Mark as declined
      await db.update(inquiries).set({ status: 'Declined' }).where(eq(inquiries.id, inquiryId));
      
      // Emit socket event
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

  
  
  app.post("/api-v2/stripe/create-account", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api-v2/stripe/onboard-refresh/:id", async (req, res) => {
     res.redirect('/seller?stripe_refresh=true');
  });

  app.get("/api-v2/stripe/onboard-return/:id", async (req, res) => {
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

  app.post("/api-v2/stripe/create-checkout-session", requireAuth, async (req, res) => {
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
      const totalAmount = Math.round(unitCost * inq.quantity * 100); // in cents
      
      const platformFee = Math.round(totalAmount * 0.05); // 5% platform fee example

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
        payment_intent_data: {
          // Funds will be held in the platform account until Escrow Release
        },
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

  app.get("/api-v2/public/partners", async (req, res) => {
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
        contacted: true
      })).filter(l => l.name);

      const sellers = await db.select({ companyName: users.companyName, country: users.country }).from(users).where(eq(users.role, 'seller'));
      for (const seller of sellers) {
         if (seller.companyName && !responseList.find(r => r.name === seller.companyName)) {
            responseList.push({ name: seller.companyName, location: seller.country, signedUp: true, contacted: true });
         }
      }

      res.json(responseList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api-v2/inquiries/:id", requireAuth, async (req: AuthRequest, res) => {
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} // <-- Ensure this closing bracket exists!

module.exports = app;
