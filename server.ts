import 'dotenv/config';
import EasyPostClient from '@easypost/api';
import { FieldValue } from "firebase-admin/firestore";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { validateEnv } from "./src/envValidator.js";
import bcrypt from "bcryptjs";
try {
  validateEnv();
} catch (e) {
  console.warn("Env Validation Warning:", e);
}
import { generateB2BEmailHtml, generateNewRFQEmailHtml, generateAbandonedRFQEmailHtml } from "./src/lib/emailTemplate.js";
import Stripe from 'stripe';
import crypto from "crypto";
import { Resend } from "resend";

import { resend, ai, generateEmbedding, getStripe, getEasyPost } from "./src/lib/services.js";
import path from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { adminDb, adminAuth } from "./src/lib/firebase-admin.js";
import { requireAuth, AuthRequest } from "./src/middleware/auth.js";
import { getOrCreateUser, getUserProfile, updateUserProfile } from "./src/db/users.js";
import { db, ensureSealedTaxonomySchema } from "./src/db/index.js";
import { products, categories, inquiries, inquiryMessages, users, marketing_logs, affiliates, leads, reviews, feedback, wishlists } from "./src/db/schema.js";
import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc, gte, lte } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { fixOldInquiries } from "./fix_old_inquiries.js";
import adminRouter from "./src/routes/admin.js";
import authRouter from "./src/routes/auth.js";
import productsRouter from "./src/routes/products.js";
import sellerRouter from "./src/routes/seller.js";
import profileRouter from "./src/routes/profile.js";
import rfqsRouter from "./src/routes/rfqs.js";
import leadsRouter from "./src/routes/leads.js";
import webhooksRouter from "./src/routes/webhooks.js";
import categoriesRouter from "./src/routes/categories.js";

// Background task to process drip campaigns

async function generateWithRetry(ai: any, params: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const isTransient = err.status === 503 || err.status === 429 || (err.message && (err.message.includes('503') || err.message.includes('429')));
      if (isTransient && i < maxRetries - 1) {
        console.warn(`AI model busy (attempt ${i + 1}/${maxRetries}). Retrying in ${Math.pow(2, i)}s...`);
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
        continue;
      }
      throw err;
    }
  }
}

const app = express();
app.get(["/cron/drip", "/api/cron/drip", "/api-v2/cron/drip"], async (req, res) => {
  try {
    const now = new Date();
    
    // 1. Process Marketing Leads
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
          await db.update(leads).set({ dripStep: nextStep, lastEmailedAt: now }).where(eq(leads.id, lead.id));
       }
    }

    // 2. Process Abandoned RFQs (Draft Inquiries > 24h)
    const abandonedDrafts = await db.select({
      id: inquiries.id,
      buyerId: inquiries.buyerId,
      createdAt: inquiries.createdAt,
      productTitle: products.title,
      buyerEmail: users.email,
      buyerName: users.displayName
    })
    .from(inquiries)
    .leftJoin(products, eq(inquiries.targetProductId, products.id))
    .leftJoin(users, eq(inquiries.buyerId, users.id))
    .where(eq(inquiries.status, 'Draft'));

    let abandonedCount = 0;
    for (const draft of abandonedDrafts) {
       if (!draft.createdAt || !draft.buyerEmail) continue;
       const hoursSinceCreation = (now.getTime() - new Date(draft.createdAt).getTime()) / (1000 * 3600);
       
       // Send once between 24 and 48 hours
       if (hoursSinceCreation >= 24 && hoursSinceCreation <= 48) {
         console.log(`Sending Abandoned RFQ reminder to ${draft.buyerEmail}`);
         if (resend) {
           await resend.emails.send({
             from: 'Hatake.Shop <notifications@hatake.shop>',
             to: draft.buyerEmail,
             subject: `Complete your Request for Quote: ${draft.productTitle}`,
             html: generateAbandonedRFQEmailHtml(
               draft.buyerName || 'Buyer',
               draft.productTitle || 'a product',
               `${process.env.APP_URL || 'https://hatakeshop.vercel.app'}/rfq`
             )
           });
         }
         abandonedCount++;
       }
    }

    // 3. Auto-Archive Stale Inquiries (>30 days inactive)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const activeStatuses = ['Sent', 'Pending', 'Under Negotiation'];
    
    // We update where status is one of the active ones AND updatedAt < thirtyDaysAgo
    const archivedResult = await db.update(inquiries)
      .set({ status: 'Archived', updatedAt: now })
      .where(
        and(
          inArray(inquiries.status, activeStatuses),
          sql`${inquiries.updatedAt} < ${thirtyDaysAgo.toISOString()}`
        )
      )
      .returning({ id: inquiries.id });

    res.json({ 
      success: true, 
      processedLeads: pendingLeads.length, 
      abandonedRFQsReminded: abandonedCount,
      archivedInquiries: archivedResult.length
    });
  } catch (e: any) {
    console.error("Cron Drip error:", e);
    res.status(500).json({ error: e.message });
  }
});
app.get("/api-v2/debug-firebase", (req, res) => { import("./src/lib/firebase-admin.js").then(m => { res.json({ error: m.firebaseInitError, hasJson: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON, hasPrivKey: !!process.env.FIREBASE_PRIVATE_KEY }) }) });
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// ---------------------------------------------------------------------------
// SECURITY & PERFORMANCE MIDDLEWARE
// ---------------------------------------------------------------------------
app.set('trust proxy', 1); // Vercel sits behind a proxy; needed for correct rate-limit IPs
app.use(helmet({
  contentSecurityPolicy: false, // SPA loads scripts/styles from self + inline; CSP tuned later
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // product images are hot-linked by the SPA
}));
app.use(compression());

// General API rate limit + stricter auth brute-force guard
const apiLimiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use(["/api", "/api-v2"], apiLimiter);
app.use(["/api/auth", "/api-v2/auth"], authLimiter);
app.use(["/translate", "/api/translate", "/api-v2/translate",
         "/sourcing/ai-match", "/api/sourcing/ai-match", "/api-v2/sourcing/ai-match"], aiLimiter);

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

app.use(express.json({ limit: '1mb' }));

// NOTE: Admin product update routes live in src/routes/admin.ts
// (PATCH /admin/products/bulk and /admin/products/:id). Do not re-register
// them here — a handler registered before the routers would shadow the
// canonical ones and silently drift out of sync.

// -------------------------------------------------------------------------
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// --- Static build output (serves assets, robots.txt, sitemap.xml, etc.) ---
// On Vercel, static files are served by the CDN before functions run; this
// matters for local dev and non-Vercel deployments.
const distDir = path.join(process.cwd(), 'dist');
app.use(express.static(distDir, { index: false, maxAge: '1h' }));

// --- SEO: robots.txt & sitemap.xml (real files for crawlers) ---
const SITE_URL = (process.env.APP_URL || 'https://www.hatake.shop').replace(/\/$/, '');

app.get(["/robots.txt", "/api/robots.txt", "/api-v2/robots.txt"], (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/db
Disallow: /api/
Disallow: /api-v2/

Sitemap: ${SITE_URL}/sitemap.xml
`);
});

app.get(["/sitemap.xml", "/api/sitemap.xml", "/api-v2/sitemap.xml"], async (req, res) => {
  try {
    const staticPaths = ['', '/marketplace', '/suppliers', '/insights', '/feed', '/login', '/apply-seller'];
    const urls: string[] = staticPaths.map(p => SITE_URL + p);

    const [productRows, sellerRows, catRows] = await Promise.all([
      db.select({ id: products.id, createdAt: products.createdAt })
        .from(products).where(eq(products.approvalStatus, 'approved')).limit(5000),
      db.select({ slug: users.storeSlug }).from(users).where(isNotNull(users.storeSlug)).limit(2000),
      db.select({ id: categories.id }).from(categories).limit(1000),
    ]);

    for (const p of productRows) urls.push(`${SITE_URL}/marketplace?product=${p.id}`);
    for (const s of sellerRows) if (s.slug) urls.push(`${SITE_URL}/v/${s.slug}`);
    for (const c of catRows) urls.push(`${SITE_URL}/marketplace?category=${c.id}`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e: any) {
    // Never fail crawlers: emit at least the static pages
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
  <url><loc>${SITE_URL}/marketplace</loc></url>
</urlset>`);
  }
});

// --- Health check (uptime monitors, Neon keep-alive) ---
app.get(["/health", "/api/health", "/api-v2/health"], async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, db: 'up', ts: new Date().toISOString() });
  } catch (e: any) {
    res.status(503).json({ ok: false, db: 'down', error: e.message });
  }
});

// NOTE: GET /api-v2/products is served by src/routes/products.ts (supports pagination,
// language / sealed-type / country facets and sorting). Do not re-add a handler here.

// --- ROUTE MOUNTING (Supporting both /api/ and /api-v2/ prefixes to prevent 404s) ---
import feedRouter from "./src/routes/feed.js";
import notificationsRouter from "./src/routes/notifications.js";
const routers = [adminRouter, authRouter, productsRouter, sellerRouter, profileRouter, rfqsRouter, leadsRouter, webhooksRouter, categoriesRouter, feedRouter, notificationsRouter];

// Attach the Socket.IO instance to every request BEFORE the routers mount, so
// route handlers can emit real-time events via `(req as any).io?.emit(...)`.
// (Registered after the routers it was always undefined for router handlers.)
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

for (const router of routers) {
  app.use("/", router);
  app.use("/api", router);
  app.use("/api-v2", router);
}

// --- BOT API ENDPOINT ---
const botRouter = express.Router();
botRouter.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    // Handle incoming bot webhooks (e.g., Telegram, Discord, Slack)
    console.log("Received Bot API Webhook update:", update);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Bot API error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/bot", botRouter);
app.use("/api-v2/bot", botRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.APP_URL || 'https://www.hatake.shop', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
});

// --- Socket.IO authentication: resolve the user BEFORE accepting events ---
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized: missing token'));
    const decoded = await adminAuth.verifyIdToken(token);
    (socket.data as any).uid = decoded.uid;
    (socket.data as any).email = decoded.email || '';
    next();
  } catch (e) {
    next(new Error('Unauthorized: invalid token'));
  }
});

// Helper: resolve the DB user id + verify inquiry participation for sockets
async function socketIdentity(socket: any): Promise<{ userId: number } | null> {
  try {
    const profile = await getUserProfile(socket.data.uid);
    if (!profile) return null;
    return { userId: profile.id };
  } catch {
    return null;
  }
}

async function isParticipant(inquiryId: number, userId: number): Promise<boolean> {
  try {
    const rows = await db.select({ buyerId: inquiries.buyerId, sellerId: inquiries.targetSellerId, productId: inquiries.targetProductId })
      .from(inquiries).where(eq(inquiries.id, inquiryId)).limit(1);
    if (rows.length === 0) return false;
    const row = rows[0];
    if (row.buyerId === userId || row.sellerId === userId) return true;
    if (row.productId) {
      const prod = await db.select({ sellerId: products.sellerId }).from(products).where(eq(products.id, row.productId)).limit(1);
      if (prod.length > 0 && prod[0].sellerId === userId) return true;
    }
    return false;
  } catch {
    return false;
  }
}

io.on("connection", (socket) => {
  socket.on("join_inquiry", async (inquiryId) => {
    const identity = await socketIdentity(socket);
    if (!identity) return;
    if (!(await isParticipant(Number(inquiryId), identity.userId))) return;
    socket.join(`inquiry_${inquiryId}`);
  });

  socket.on("send_message", async (data) => {
    try {
      const identity = await socketIdentity(socket);
      if (!identity) return; // never trust a client-supplied senderId
      const inquiryIdNum = Number(data.inquiryId);
      if (!Number.isFinite(inquiryIdNum)) return;
      if (!(await isParticipant(inquiryIdNum, identity.userId))) return;

       const [newMsg] = await db.insert(inquiryMessages).values({
          inquiryId: inquiryIdNum,
          senderId: identity.userId,
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
    socket.to(`inquiry_${data.inquiryId}`).emit("typing_indicator", data);
  });

  socket.on("mark_read", async (data) => {
    try {
       const identity = await socketIdentity(socket);
       if (!identity) return;
       await db.update(inquiryMessages)
          .set({ readReceipt: true })
          .where(and(
             eq(inquiryMessages.inquiryId, data.inquiryId),
             ne(inquiryMessages.senderId, identity.userId),
             eq(inquiryMessages.readReceipt, false)
          ));
       io.to(`inquiry_${data.inquiryId}`).emit("messages_read", { inquiryId: data.inquiryId, byUserId: identity.userId });
    } catch(e) {
       console.error(e);
    }
  });

  socket.on("join_user", (uid) => {
    // Only allow joining your own notification channel
    if (uid === socket.data.uid) {
      socket.join(`user_${uid}`);
    }
  });

  // Relay events are only forwarded to sockets that actually joined the
  // inquiry room (join_inquiry verifies participation server-side).
  const relayIfMember = (event: string, serverEvent: string) => (data: any) => {
    const room = `inquiry_${data?.inquiryId}`;
    if (!data?.inquiryId || !socket.rooms.has(room)) return;
    socket.to(room).emit(serverEvent, data);
  };

  socket.on("receiver_ready", relayIfMember("receiver_ready", "receiver_ready"));
  socket.on("webrtc_offer", relayIfMember("webrtc_offer", "webrtc_offer"));
  socket.on("webrtc_answer", relayIfMember("webrtc_answer", "webrtc_answer"));
  socket.on("webrtc_ice_candidate", relayIfMember("webrtc_ice_candidate", "webrtc_ice_candidate"));

  socket.on("whiteboard_draw", relayIfMember("whiteboard_draw", "whiteboard_draw"));
  socket.on("whiteboard_clear", relayIfMember("whiteboard_clear", "whiteboard_clear"));
  socket.on("whiteboard_image", relayIfMember("whiteboard_image", "whiteboard_image"));
  socket.on("start_video_call", relayIfMember("start_video_call", "video_call_incoming"));
  socket.on("accept_video_call", relayIfMember("accept_video_call", "video_call_accepted"));
  socket.on("end_video_call", relayIfMember("end_video_call", "video_call_ended"));
  socket.on("live_caption", relayIfMember("live_caption", "live_caption"));
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Bootstrap Admin User & Products
// NOTE: team members are matched by EMAIL (not uid) so we never create
// duplicate rows for users who already signed up with Firebase.
async function upsertTeamMember(opts: {
  email: string; uid: string; displayName: string; role: 'seller' | 'admin';
  teamRole: 'owner' | 'sales_rep' | 'catalog_manager'; companyName: string; teamOwnerId?: number;
}): Promise<number> {
  const existing = await db.select().from(users).where(eq(users.email, opts.email)).limit(1);
  if (existing.length > 0) {
    await db.update(users).set({
      displayName: opts.displayName,
      role: opts.role,
      teamRole: opts.teamRole,
      companyName: opts.companyName,
      ...(opts.teamOwnerId ? { teamOwnerId: opts.teamOwnerId } : {}),
    }).where(eq(users.id, existing[0].id));
    return existing[0].id;
  }
  const inserted = await db.insert(users).values({
    uid: opts.uid,
    email: opts.email,
    displayName: opts.displayName,
    role: opts.role,
    teamRole: opts.teamRole,
    companyName: opts.companyName,
    teamOwnerId: opts.teamOwnerId,
    country: 'EU',
    verificationStatus: 'verified',
  }).returning();
  return inserted[0].id;
}

async function bootstrapDB() {
  try {
    const hatakeCompany = 'Hatake KB';

    const teamOwnerId = await upsertTeamMember({
      email: 'stefan@hatake.eu', uid: 'stefan-uid', displayName: 'Stefan',
      role: 'seller', teamRole: 'owner', companyName: hatakeCompany,
    });

    await upsertTeamMember({
      email: 'ernst@hatake.eu', uid: 'ernst-uid', displayName: 'Ernst',
      role: 'admin', teamRole: 'catalog_manager', companyName: hatakeCompany, teamOwnerId,
    });
    await upsertTeamMember({
      email: 'zudran@hatake.eu', uid: 'zudran-uid', displayName: 'Zudran',
      role: 'seller', teamRole: 'sales_rep', companyName: hatakeCompany, teamOwnerId,
    });

    const adminResult = await db.select().from(users).where(eq(users.email, 'stefan@hatake.eu')).limit(1);
    console.log("Hatake team synced to DB");

    const existingProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
    if (Number(existingProducts[0].count) === 0 && adminResult.length > 0) {
      await db.insert(products).values([
        { sellerId: adminResult[0].id, title: 'Corrugated Shipping Boxes (Bulk)', description: 'Heavy duty shipping boxes ideal for international freight.', moq: 500, originType: 'Direct Factory', leadTimeDays: 14 },
        { sellerId: adminResult[0].id, title: 'Hatake KB Top-Loaders (1000ct)', description: 'Premium protective card sleeves for collectibles.', moq: 10, originType: 'Verified EU Carrier/Warehouse', leadTimeDays: 3 },
        { sellerId: adminResult[0].id, title: 'Industrial Warehouse Shelving Unit', description: 'Heavy duty steel shelving for pallets.', moq: 5, originType: 'Global Distributor', leadTimeDays: 21 },]);
      console.log("Database seeded with initial products.");
    }
  } catch (err) {
    console.error("Failed to bootstrap admin/products:", err);
  }
}

if (process.env.NODE_ENV !== 'production') {
  bootstrapDB();
}

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
app.get(["/wishlists", "/api/wishlists", "/api-v2/wishlists"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    if (!userProfile) {
      return res.json([]);
    }
    const items = await db.select().from(wishlists).where(eq(wishlists.userId, userProfile.id));
    res.json(items);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post(["/wishlists/toggle", "/api/wishlists/toggle", "/api-v2/wishlists/toggle"], requireAuth, async (req: AuthRequest, res) => {
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

// Notifications API (Firestore-backed)

app.post(["/feedback", "/api/feedback", "/api-v2/feedback"], async (req: AuthRequest, res) => {
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


app.post(["/upload", "/api/upload", "/api-v2/upload"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { imageBase64, filename } = req.body;

    if (!imageBase64) return res.status(400).send("No image provided");

    // Firestore documents are capped at ~1 MiB: anything larger silently fails
    // to store, so reject early with a clear message instead.
    const MAX_BASE64_CHARS = 750_000; // ~560 KB binary
    if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_BASE64_CHARS) {
      return res.status(413).json({ error: "Image too large. Please compress to under 500 KB before uploading." });
    }

    // Only accept real image data URLs (prevents HTML/SVG/script payloads)
    const dataUrlMatch = imageBase64.match(/^data:(image\/(png|jpe?g|webp|gif|avif));base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!dataUrlMatch) {
      return res.status(400).json({ error: "Invalid image format. Allowed: png, jpg, webp, gif, avif." });
    }
    const mimeType = dataUrlMatch[1].toLowerCase();

    const docRef = await adminDb.collection("uploaded_images").add({
      data: imageBase64,
      mimeType,
      uploader: req.user.uid,
      createdAt: new Date()
    });

    res.json({ url: `/api/images/${docRef.id}${filename ? "/" + encodeURIComponent(filename) : ""}` });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get(["/images/:id/:filename?", "/api/images/:id/:filename?", "/api-v2/images/:id/:filename?"], async (req, res) => {
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
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error fetching image");
  }
});

app.get(["/invitations/validate", "/api/invitations/validate", "/api-v2/invitations/validate"], async (req, res) => {
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

app.get(["/store/:slug", "/api/store/:slug", "/api-v2/store/:slug"], async (req, res) => {
  try {
    const { slug } = req.params;
    const storeUser = await db.select().from(users).where(eq(users.storeSlug, slug)).limit(1);
    if (storeUser.length === 0) return res.status(404).json({ error: "Store not found" });
    
    const store = storeUser[0];
    const rawProducts = await db.select({
      product: products,
      categoryName: categories.name
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.sellerId, store.id));

    const storeProducts = rawProducts.map((r: any) => ({
      ...r.product,
      categoryName: r.categoryName
    }));
    
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

app.get(["/affiliates/stats", "/api/affiliates/stats", "/api-v2/affiliates/stats"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    if (!userProfile) return res.status(404).send("User not found");
    
    let refCode = userProfile.referralCode;
    if (!refCode) {
      refCode = "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.update(users).set({ referralCode: refCode }).where(eq(users.id, userProfile.id));
    }
    
    const referredUsers = await db.select().from(users).where(eq(users.referredById, userProfile.id));
    const referredLeads = await db.select().from(leads).where(eq(leads.referredById, userProfile.id));
    
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
      commissionEarned: totalGmv * 0.01
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


app.get(["/marketplace/sneak-peek", "/api/marketplace/sneak-peek", "/api-v2/marketplace/sneak-peek"], async (req, res) => {
  try {
    await ensureSealedTaxonomySchema();
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
         if (group.products.length < 12) {
            group.products.push(item);
         }
      }
      const groups = Array.from(sellerMap.values());

      for (const group of groups) {
        group.products.sort(() => Math.random() - 0.5);
      }
      groups.sort(() => Math.random() - 0.5);

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

// Browse overview for the "All Categories" view: a few products per category (mixed
// suppliers) + every company A-Z with a small product preview. Powers the marketplace
// browse sections and the home "Featured Categories" sections.
app.get(["/marketplace/browse", "/api/marketplace/browse", "/api-v2/marketplace/browse"], async (req, res) => {
  try {
    await ensureSealedTaxonomySchema();
    const productType = (req.query.productType as string) || 'sealed';
    const sortBy = (req.query.sortBy as string) || 'company_az';
    const PREVIEW_COUNT = 4;
    const typeCondition = productType === 'graded'
      ? eq(products.productType, 'graded')
      : sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`;

    const [allRows, topCategories, allCats] = await Promise.all([
      db.select({
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
          createdAt: products.createdAt
        },
        seller: { id: users.id, companyName: users.companyName, country: users.country, verificationStatus: users.verificationStatus }
      })
        .from(products)
        .leftJoin(users, eq(products.sellerId, users.id))
        .where(and(eq(products.approvalStatus, 'approved'), typeCondition))
        .orderBy(desc(products.createdAt)),
      db.select().from(categories).where(sql`parent_id IS NULL`).orderBy(categories.sortOrder),
      db.select().from(categories)
    ]);

    const flat: any[] = allRows.map((r: any) => ({ ...r.product, seller: r.seller }));
    const catalog = flat.filter((p: any) => !(p.isSponsored || p.is_sponsored || p.sponsored || p.featured));
    const sponsored = flat.filter((p: any) => p.isSponsored || p.is_sponsored || p.sponsored || p.featured).slice(0, 6);

    // --- helpers for ordering previews ---
    const priceOf = (p: any): number | null => {
      let tiers: any = p.tieredPricing;
      if (typeof tiers === 'string') { try { tiers = JSON.parse(tiers); } catch { tiers = []; } }
      if (Array.isArray(tiers) && tiers.length > 0) {
        const prices = tiers.map((t: any) => Number(t.price ?? t.unitPrice)).filter((n: number) => Number.isFinite(n) && n > 0);
        if (prices.length > 0) return Math.min(...prices);
      }
      const base = Number(p.unitCost ?? p.unitPrice);
      return Number.isFinite(base) && base > 0 ? base : null;
    };
    const companyKey = (p: any) => String(p.seller?.companyName || '\uffff');
    const timeOf = (p: any) => new Date(p.createdAt ?? 0).getTime();
    const sortProducts = (list: any[]) => {
      const arr = [...list];
      if (sortBy === 'company_az') {
        arr.sort((a, b) => companyKey(a).localeCompare(companyKey(b)) || timeOf(b) - timeOf(a));
      } else if (sortBy === 'company_za') {
        arr.sort((a, b) => companyKey(b).localeCompare(companyKey(a)) || timeOf(b) - timeOf(a));
      } else if (sortBy === 'lowest_price' || sortBy === 'price_asc') {
        arr.sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity));
      } else if (sortBy === 'highest_price' || sortBy === 'price_desc') {
        arr.sort((a, b) => (priceOf(b) ?? -Infinity) - (priceOf(a) ?? -Infinity));
      } else if (sortBy === 'lowest_moq' || sortBy === 'moq_asc') {
        arr.sort((a, b) => (a.moq ?? 0) - (b.moq ?? 0));
      } else {
        arr.sort((a, b) => timeOf(b) - timeOf(a));
      }
      return arr;
    };

    // --- map every category to its top-level ancestor + descendant sets ---
    const byId = new Map<number, any>();
    for (const c of allCats) byId.set((c as any).id, c);
    const topAncestor = (id: number | null | undefined): number | null => {
      let cur = id ?? null;
      const seen = new Set<number>();
      while (cur != null && byId.has(cur) && !seen.has(cur)) {
        seen.add(cur);
        const c: any = byId.get(cur);
        if (c.parentId == null) return c.id;
        cur = c.parentId;
      }
      return cur;
    };
    const childrenOf = new Map<number | null, any[]>();
    for (const c of allCats) {
      const key = ((c as any).parentId ?? null) as number | null;
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key)!.push(c);
    }
    const descendants = (id: number): Set<number> => {
      const out = new Set<number>([id]);
      const stack = [id];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        for (const child of (childrenOf.get(cur) || [])) {
          const cid = (child as any).id;
          if (!out.has(cid)) { out.add(cid); stack.push(cid); }
        }
      }
      return out;
    };

    // --- category previews (mixed suppliers) ---
    const catBuckets = new Map<number, any[]>();
    for (const p of catalog) {
      let top = topAncestor(p.categoryId);
      if (top == null && Array.isArray(p.categoryIds) && p.categoryIds.length > 0) {
        for (const cid of p.categoryIds) {
          const t = topAncestor(cid);
          if (t != null) { top = t; break; }
        }
      }
      if (top == null) continue;
      if (!catBuckets.has(top)) catBuckets.set(top, []);
      catBuckets.get(top)!.push(p);
    }

    const categoriesOut: any[] = [];
    for (const cat of topCategories as any[]) {
      const bucket = catBuckets.get(cat.id) || [];
      if (bucket.length === 0) continue;
      const subOut: any[] = [];
      for (const sub of (childrenOf.get(cat.id) || []) as any[]) {
        const desc = descendants(sub.id);
        const count = catalog.filter((p: any) =>
          (p.categoryId != null && desc.has(p.categoryId)) ||
          (Array.isArray(p.categoryIds) && p.categoryIds.some((cid: number) => desc.has(cid)))
        ).length;
        if (count > 0 || sub.isVisibleIfEmpty) subOut.push({ id: sub.id, name: sub.name, productCount: count });
      }
      categoriesOut.push({
        id: cat.id,
        name: cat.name,
        productCount: bucket.length,
        subcategories: subOut,
        products: [...bucket].sort(() => Math.random() - 0.5).slice(0, PREVIEW_COUNT)
      });
    }

    // --- company previews, all companies A-Z ---
    const compBuckets = new Map<number, any[]>();
    for (const p of catalog) {
      const sid = p.seller?.id ?? p.sellerId;
      if (sid == null) continue;
      if (!compBuckets.has(sid)) compBuckets.set(sid, []);
      compBuckets.get(sid)!.push(p);
    }
    
    const sellerIds = Array.from(compBuckets.keys());
    const countsRes = sellerIds.length > 0 ? await db.select({
      sellerId: products.sellerId,
      count: sql<number>`count(*)::int`
    }).from(products)
    .where(and(inArray(products.sellerId, sellerIds), eq(products.approvalStatus, 'approved')))
    .groupBy(products.sellerId) : [];
    
    const countMap = new Map(countsRes.map(r => [r.sellerId, r.count]));

    const companiesOut = Array.from(compBuckets.entries()).map(([sid, list]) => {
      const s: any = list[0].seller || {};
      return {
        sellerId: sid,
        companyName: s.companyName || 'Independent Sellers',
        country: s.country ?? null,
        verificationStatus: s.verificationStatus ?? null,
        productCount: countMap.get(sid) || list.length,
        products: [...list].sort(() => Math.random() - 0.5).slice(0, PREVIEW_COUNT)
      };
    }).sort((a, b) => String(a.companyName || '').localeCompare(String(b.companyName || '')));

    res.json({ categories: categoriesOut, companies: companiesOut, sponsored });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get(["/insights", "/api/insights", "/api-v2/insights"], async (req, res) => {
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

    // Price index: derived from real inquiry volume in the period.
    // Returns an empty array when there is no data — the UI shows an
    // "insufficient data" state instead of fabricated numbers.
    const priceVolatility = (() => {
      if (filteredInquiries.length < 5) return []; // not enough data to be meaningful
      const buckets = Math.min(days, 30);
      const values: number[] = [];
      return Array.from({ length: buckets }).map((_, i) => {
         const date = new Date();
         date.setDate(date.getDate() - (buckets - 1 - i) * (days / buckets));
         const nextDate = new Date(date);
         nextDate.setDate(date.getDate() + (days / buckets));

         const dayVolume = filteredInquiries.filter(inq => {
            const inqDate = new Date(inq.createdAt!);
            return inqDate >= date && inqDate < nextDate;
         }).reduce((acc, curr) => acc + (curr.quantity * (parseFloat(curr.targetBudget as string) || 0)), 0);

         values.push(dayVolume);
         // Simple moving-average index relative to the mean (100 = average period)
         const mean = values.reduce((a, b) => a + b, 0) / values.length || 1;
         return {
            date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            index: Number(((dayVolume / mean) * 100).toFixed(1))
         }
      });
    })();

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

app.post("/api-v2/ai/onboarding", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: `You are an onboarding assistant for Hatake, a B2B TCG (Trading Card Game) marketplace.
The user will describe their business needs. Extract their preferences into a JSON object with this exact schema:
{
  "role": "retailer" | "distributor" | "collector" | "investor" | "other",
  "interests": ["Pokemon", "One Piece", "Naruto", "Dragon Ball", "Disney Lorcana", "Yu-Gi-Oh", "Magic", "Flesh and Blood", "Union Arena", "Weiss Schwarz"],
  "languages": ["English", "Japanese", "zh-Hans", "zh-Hant"],
  "buyScale": "single_cases" | "pallets" | "containers" | "unknown",
  "wantsCart": true | false,
  "cartBudget": number | null
}
If they don't mention something explicitly, try to infer the best fit. If you can't guess, use "unknown" or empty arrays.
CRITICAL: If the user explicitly asks you to build, create, or recommend a cart/RFQ (e.g., for a specific amount like 350), set "wantsCart" to true and extract the number into "cartBudget". 
User input: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = typeof response.text === 'function' ? (response as any).text() : response.text;
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const json = JSON.parse(cleaned || "{}");
    
    // Auto-generate cart if requested
    if (json.wantsCart && json.cartBudget > 0) {
       try {
         let conditions = [eq(products.approvalStatus, 'approved')];
         if (json.interests && json.interests.length > 0) {
            conditions.push(inArray(products.brand, json.interests));
         }
         const availableProducts = await db.select({
             product: products,
             seller: { companyName: users.companyName }
           })
           .from(products)
           .leftJoin(users, eq(products.sellerId, users.id))
           .where(and(...conditions))
           .limit(50);
           
         let remainingBudget = json.cartBudget;
         let cartItems = [];
         
         // Shuffle available products slightly for variety
         const shuffled = availableProducts.sort(() => Math.random() - 0.5);
         
         for (const row of shuffled) {
            const p = row.product;
            const price = Number(p.unitCost);
            const moq = p.moq || 1;
            if (price > 0 && (price * moq) <= remainingBudget) {
               // Recommend a sensible quantity
               const affordableQty = Math.floor(remainingBudget / price);
               const take = Math.min(affordableQty, p.stockQuantity || 10, moq * 5); // Don't take all stock, take up to 5x MOQ
               if (take >= moq) {
                  cartItems.push({ product: { ...p, seller: row.seller }, quantity: take });
                  remainingBudget -= (take * price);
               }
            }
            if (remainingBudget <= (json.cartBudget * 0.05)) break; // Stop if we used 95% of budget
         }
         json.cartItems = cartItems;
       } catch (dbErr) {
         console.error("Failed to build auto-cart:", dbErr);
       }
    }

    res.json(json);
  } catch (error: any) {
    console.error("AI Onboarding Error:", error);
    res.status(500).json({ error: `Failed to process onboarding: ${error.message || "Unknown error"}` });
  }
});

app.post(["/sourcing/ai-match", "/api/sourcing/ai-match", "/api-v2/sourcing/ai-match"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { prompt } = req.body;

    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User profile missing");

    const aiPrompt = `You are an AI sourcing engine for a B2B wholesale platform. 
    The user wants to source: "${prompt}"
    
    Extract the requirements and return a JSON object with:
    - lineItems: array of { category: string, suggestedTitle: string, targetQuantity: number, targetBudgetPerUnit: number, targetBudgetTotal: number }
    - totalTargetBudget: number
    - shippingDestination: string
    - originPreference: string (e.g. EU, Asia, Any)
    - notes: string (any specific custom requirements mentioned)
    `;

    const aiResponse = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: aiPrompt,
      config: {
          responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(aiResponse.text || "{}");

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

app.post(["/translate", "/api/translate", "/api-v2/translate"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) return res.status(400).json({ error: "Missing text or target language" });
    
    const aiResponse = await generateWithRetry(ai, {
       model: "gemini-3.8-flash",
       contents: `Translate the following text to ${targetLanguage}. Only return the raw translated text, without any conversational wrapping, markdown, or quotes.\n\nText: ${text}`
    });
    
    res.json({ translation: aiResponse.text?.trim() });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post(["/seller/:id/contact", "/api/seller/:id/contact", "/api-v2/seller/:id/contact"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const sellerId = parseInt(req.params.id, 10);
    const sellerQuery = await db.select().from(users).where(eq(users.id, sellerId));
    if (sellerQuery.length === 0) return res.status(404).send("Seller not found");
    const sellerProfile = sellerQuery[0];

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

    try {
      const buyerName = userProfile.companyName || userProfile.displayName || "A buyer";
      const productTitle = product[0]?.title || "A product";
      await resend.emails.send({
        from: "Hatake.Shop <notifications@hatake.shop>",
        to: sellerProfile.email,
        subject: `New Request for Quote: ${productTitle}`,
        html: generateNewRFQEmailHtml(
          buyerName, 
          productTitle, 
          Number(quantity), 
          `${process.env.APP_URL || 'https://hatakeshop.vercel.app'}/rfq`
        )
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

app.post(["/agora-token", "/api/agora-token", "/api-v2/agora-token"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const { channelName } = req.body;
    if (!channelName) return res.status(400).json({ error: "channelName is required" });
    
    const appId = process.env.VITE_AGORA_APP_ID || process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";
    
    if (!appId) return res.status(400).json({ error: "Agora App ID is missing" });
    
    const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    if (!appCertificate) {
       return res.json({ appId, token: null });
    }
    
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
    res.json({ appId, token });
  } catch (e: any) {
    console.error("Agora Token Error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post(["/logistics/estimate", "/api/logistics/estimate", "/api-v2/logistics/estimate"], async (req, res) => {
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

app.post(["/cart/rfq", "/api/cart/rfq", "/api-v2/cart/rfq"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProfile = await getUserProfile(req.user.uid);
    if (!userProfile) return res.status(404).send("User missing");

    const { items } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: "No items in cart" });
    }

    const grouped = items.reduce((acc: any, item: any) => {
      const sid = item.supplierId;
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(item.productId);
      return acc;
    }, {});

    const createdInquiries = [];

    for (const supplierId of Object.keys(grouped)) {
      const productIds = grouped[supplierId];
      
      const result = await db.insert(inquiries).values({
        buyerId: userProfile.id,
        targetSellerId: parseInt(supplierId, 10),
        quantity: 1,
        status: 'Draft'
      }).returning();
      
      const newInquiry = result[0];
      
      await db.insert(inquiryMessages).values({
        inquiryId: newInquiry.id,
        senderId: userProfile.id,
        messageContent: `Requested bulk quote for product IDs: ${productIds.join(', ')}`,
        isOfficialQuote: false
      });

      try {
        const seller = await db.query.users.findFirst({
          where: eq(users.id, parseInt(supplierId, 10))
        });
        if (seller) {
          await adminDb.collection('inquiries').doc(newInquiry.id.toString()).set({
            buyerUid: req.user.uid,
            sellerUid: seller.uid
          });
          // Trigger Notification via Postgres
          try {
            const { db } = await import('./src/db/index.js');
            const { users, notifications } = await import('./src/db/schema.js');
            const { eq } = await import('drizzle-orm');
            const sellerDb = await db.select().from(users).where(eq(users.uid, seller.uid)).limit(1);
            if (sellerDb.length > 0) {
              await db.insert(notifications).values({
                userId: sellerDb[0].id,
                title: "New Inquiry!",
                message: `You received a new inquiry from ${req.user!.email}`,
                link: '/rfq'
              });
            }
          } catch(e) { console.error("Error inserting notification", e); }

          if (seller.email) {
            try {
              const buyerName = userProfile.companyName || userProfile.displayName || "A buyer";
              const productTitle = "Multiple Products (Bulk RFQ)";
              
              const htmlBody = generateNewRFQEmailHtml(
                buyerName,
                productTitle,
                Number(totalQuantity),
                `${process.env.APP_URL || 'https://hatakeshop.vercel.app'}/rfq`
              );

              await resend.emails.send({
                from: "Hatake.Shop <notifications@hatake.eu>",
                to: seller.email,
                subject: `New Bulk Request for Quote from ${buyerName}`,
                html: htmlBody
              });
            } catch (emailErr) {
              console.error("Cart RFQ email failed:", emailErr);
            }
          }
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


import fs from 'fs';

// SEO Injection routes for Vercel Serverless
const injectSEO = async (req: any, res: any, fetchMetadata: () => Promise<{title: string, description: string, image?: string}>) => {
  try {
    const isVercel = !!process.env.VERCEL;
    const indexPath = isVercel ? path.join(process.cwd(), 'dist', 'index.html') : path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    
    const meta = await fetchMetadata();
    if (meta.title) html = html.replace(/<title>(.*?)<\/title>/, `<title>${meta.title} | Hatake.Shop</title>`);
    if (meta.description) html = html.replace(/<meta name="description" content="(.*?)"\s*\/?>/, `<meta name="description" content="${meta.description}" />`);
    if (meta.image) {
      html = html.replace(/<head>/, `<head>\n    <meta property="og:image" content="${meta.image}" />\n    <meta name="twitter:image" content="${meta.image}" />`);
    }
    html = html.replace(/<head>/, `<head>\n    <meta property="og:title" content="${meta.title} | Hatake.Shop" />\n    <meta property="og:description" content="${meta.description}" />`);
    
    res.send(html);
  } catch (err) {
    console.error("SEO Injection error:", err);
    // fallback to normal
    const distPath = path.join(process.cwd(), 'dist');
    res.sendFile(path.join(distPath, 'index.html'));
  }
};

app.get("/product/:id", async (req, res, next) => {
  // Only intercept normal GETs, not API requests
  if (req.headers.accept?.includes('application/json')) return next();
  
  injectSEO(req, res, async () => {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) return { title: "Product Not Found", description: "This product could not be found." };
    const p = await db.select().from(products).where(eq(products.id, productId));
    if (!p.length) return { title: "Product Not Found", description: "This product could not be found." };
    let img = undefined;
    try {
      const imgs = JSON.parse(p[0].images as string || '[]');
      if (imgs.length) img = imgs[0];
    } catch(e) {}
    return {
      title: p[0].title,
      description: `Wholesale B2B marketplace. Buy ${p[0].title} from trusted suppliers.`,
      image: img
    };
  });
});

app.get("/company/:id", async (req, res, next) => {
  if (req.headers.accept?.includes('application/json')) return next();
  
  injectSEO(req, res, async () => {
    const compId = parseInt(req.params.id, 10);
    if (isNaN(compId)) return { title: "Company Not Found", description: "This company could not be found." };
    const c = await db.select().from(users).where(eq(users.id, compId));
    if (!c.length) return { title: "Company Not Found", description: "This company could not be found." };
    return {
      title: c[0].companyName || c[0].displayName || "Company Profile",
      description: `View the B2B wholesale profile, reviews, and products for ${c[0].companyName || c[0].displayName}.`,
      image: c[0].profilePictureUrl
    };
  });
});

app.get("/company/:id/listings", async (req, res, next) => {
  if (req.headers.accept?.includes('application/json')) return next();
  
  injectSEO(req, res, async () => {
    const compId = parseInt(req.params.id, 10);
    if (isNaN(compId)) return { title: "Company Not Found", description: "This company could not be found." };
    const c = await db.select().from(users).where(eq(users.id, compId));
    if (!c.length) return { title: "Company Not Found", description: "This company could not be found." };
    return {
      title: `${c[0].companyName || c[0].displayName || "Company"} Listings`,
      description: `Browse all products and wholesale listings from ${c[0].companyName || c[0].displayName}.`,
      image: c[0].profilePictureUrl
    };
  });
});
async function startLocalServer() {
  if (process.env.NODE_ENV !== "production") {
    const viteModule = await import("vite");
    const createViteServer = viteModule.createServer;
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the manual HTTP server for local development.
// In production, Vercel automatically runs `app` as a Serverless Function.
if (process.env.NODE_ENV !== 'production') {
  startLocalServer();
}

export default app;

// Ensure CommonJS compatibility for Vercel's serverless Node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}
