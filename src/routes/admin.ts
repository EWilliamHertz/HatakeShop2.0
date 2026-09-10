import express from "express";
import { getStripe, getEasyPost, resend, generateEmbedding, ai } from "../lib/services.js";

import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, feedback, leads, affiliates, marketing_logs, categories, inquiries, inquiryMessages, reviews } from "../db/schema.js";
import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin, requireSeller } from "../middleware/roles.js";
import crypto from "crypto";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
import { getUserProfile } from "../db/users.js";

const router = Router();

router.get("/api-v2/admin/feedback", requireAuth, requireAdmin, async (req, res) => {
    try {
      const list = await db.select({
         id: feedback.id,
         userId: feedback.userId,
         type: feedback.type,
         message: feedback.message,
         status: feedback.status,
         createdAt: feedback.createdAt,
         user: {
           companyName: users.companyName,
           email: users.email
         }
      }).from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .orderBy(desc(feedback.createdAt));
      
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.patch("/api-v2/admin/feedback/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body;
      const updated = await db.update(feedback).set({ status }).where(eq(feedback.id, id)).returning();
      res.json(updated[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/admin/leads", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
      const sentCount = await db.select({ count: sql`count(*)` }).from(leads).where(not(eq(leads.status, 'pending')));
      res.json({
        leads: allLeads,
        sentCount: Number(sentCount[0].count)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/admin/leads/upload", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { leads: newLeads } = req.body;
      if (!Array.isArray(newLeads)) return res.status(400).send("Invalid leads array");
      
      let added = 0;
      for (const lead of newLeads) {
        try {
          // Fuzzy matching for keys
          const keys = Object.keys(lead);
          const findKey = (searchStrs: string[]) => keys.find(k => searchStrs.some(s => k.toLowerCase().includes(s)));
          
          const emailKey = findKey(['email']);
          let email = emailKey ? lead[emailKey] : null;
          if (!email || typeof email !== 'string') continue;
          email = email.trim();
          
          const companyKey = findKey(['company', 'business', 'name']);
          const companyName = companyKey ? lead[companyKey] : "Unknown";
          
          const websiteKey = findKey(['website', 'url', 'site']);
          const website = websiteKey ? lead[websiteKey] : null;
          
          const cityKey = findKey(['city']);
          const stateKey = findKey(['state', 'province']);
          
          let location = null;
          if (cityKey && stateKey && lead[cityKey] && lead[stateKey]) {
            location = `${lead[cityKey]}, ${lead[stateKey]}`;
          } else if (cityKey && lead[cityKey]) {
            location = lead[cityKey];
          } else if (stateKey && lead[stateKey]) {
            location = lead[stateKey];
          }
          
          const socialLinks = [];
          for (const plat of ["Facebook", "Instagram", "Twitter", "LinkedIn", "YouTube", "TikTok", "Other Socials"]) {
            if (lead[plat]) socialLinks.push(lead[plat]);
          }

          let segment = 'TCG';
          const lowerName = (companyName || '').toString().toLowerCase();
          const notesKey = findKey(['note']);
          const notes = notesKey ? (lead[notesKey] || '').toString().toLowerCase() : '';
          const combinedStr = lowerName + ' ' + notes;
          if (combinedStr.includes('sport') || combinedStr.includes('baseball') || combinedStr.includes('basketball') || combinedStr.includes('football')) {
            segment = 'Sports';
          } else if (combinedStr.includes('tcg') || combinedStr.includes('magic') || combinedStr.includes('pokemon') || combinedStr.includes('yugioh')) {
            segment = 'TCG';
          } else {
            segment = 'General';
          }

          const res = await db.insert(leads).values({
            email,
            companyName: companyName ? companyName.toString().substring(0, 255) : null,
            website,
            location,
            segment,
            socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
          }).onConflictDoNothing({ target: leads.email }).returning({ id: leads.id });
          
          if (res.length > 0) {
            added++;
          }
        } catch (e) {
          console.error("Error inserting lead:", e);
        }
      }
      res.json({ success: true, added });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/admin/leads/preview", requireAuth, requireAdmin, async (req, res) => {
    try {
      const appUrl = process.env.APP_URL || 'https://hatake.shop';
      const registrationUrl = `${appUrl}/login?invite=mock-token-123`;
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=mock@example.com`;
      const htmlContent = generateB2BEmailHtml("Acme TCG Corp", registrationUrl, unsubscribeUrl, "TCG");
      res.json({ html: htmlContent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/admin/leads/send", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { limit = 50 } = req.body || {};
      const numLimit = Math.max(1, parseInt(limit, 10) || 50);
      const pendingLeads = await db.select().from(leads).where(eq(leads.status, 'pending')).limit(numLimit);
      
      if (pendingLeads.length === 0) {
        return res.json({ success: true, sent: 0, message: "No pending leads found to send" });
      }

      const rawFrom = process.env.RESEND_FROM_EMAIL || "Hatake B2B <b2b@hatake.social>";
      const primaryFrom = rawFrom.includes('<') ? rawFrom : `Hatake B2B <${rawFrom}>`;
      const fallbackFrom = "Hatake B2B <hello@hatake.shop>";
      const replyToAddress = process.env.RESEND_REPLY_TO || "ernst@hatake.eu";
      const appUrl = process.env.APP_URL || 'https://hatake.shop';

      const emailPayloads = pendingLeads.map(lead => {
        const rawToken = crypto.randomUUID();
        const tokenHash = lead.inviteTokenHash || crypto.createHash('sha256').update(rawToken).digest('hex');
        const registrationUrl = `${appUrl}/login?invite=${rawToken}`;
        const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(lead.email)}`;
        const htmlContent = generateB2BEmailHtml(lead.companyName || "Partner", registrationUrl, unsubscribeUrl, lead.segment || "TCG");
        const subject = `${lead.companyName || 'Partner'}, join Hatake.Shop B2B`;
        return {
          lead,
          rawToken,
          tokenHash,
          htmlContent,
          subject
        };
      });

      let sent = 0;
      let fromToUse = primaryFrom;
      let batchItems = emailPayloads.map(p => ({
        from: fromToUse,
        to: [p.lead.email],
        replyTo: replyToAddress,
        subject: p.subject,
        html: p.htmlContent,
        tags: [{ name: 'lead_id', value: String(p.lead.id) }]
      }));

      let batchRes: any = null;
      try {
        batchRes = await resend.batch.send(batchItems);
        if (batchRes.error && (batchRes.error.message?.includes('not verified') || batchRes.error.statusCode === 403)) {
          console.warn(`[Batch Send] Domain in ${fromToUse} not verified, falling back to ${fallbackFrom}`);
          fromToUse = fallbackFrom;
          batchItems = emailPayloads.map(p => ({
            from: fromToUse,
            to: [p.lead.email],
            replyTo: replyToAddress,
            subject: p.subject,
            html: p.htmlContent,
            tags: [{ name: 'lead_id', value: String(p.lead.id) }]
          }));
          batchRes = await resend.batch.send(batchItems);
        }
      } catch (batchErr) {
        console.warn("[Batch Send] Exception during resend.batch.send:", batchErr);
      }

      if (batchRes?.data?.data && Array.isArray(batchRes.data.data)) {
        for (let i = 0; i < emailPayloads.length; i++) {
          const item = emailPayloads[i];
          const emailId = batchRes.data.data[i]?.id;
          const sentAt = new Date();
          await db.update(leads).set({
            status: 'sent',
            sentAt,
            inviteTokenHash: item.tokenHash,
            resendEmailId: emailId || null,
          }).where(eq(leads.id, item.lead.id));

          sent++;
          (req as any).io?.emit("lead_updated", {
            id: item.lead.id,
            status: 'sent',
            sentAt: sentAt.toISOString()
          });
        }
      } else {
        console.warn("[Batch Send] Fallback to sequential dispatch:", batchRes?.error);
        for (const item of emailPayloads) {
          try {
            let res = await resend.emails.send({
              from: fromToUse,
              to: item.lead.email,
              replyTo: replyToAddress,
              subject: item.subject,
              html: item.htmlContent,
              tags: [{ name: 'lead_id', value: String(item.lead.id) }]
            });
            if (res.error && (res.error.message?.includes('not verified') || res.error.statusCode === 403)) {
              res = await resend.emails.send({
                from: fallbackFrom,
                to: item.lead.email,
                replyTo: replyToAddress,
                subject: item.subject,
                html: item.htmlContent,
                tags: [{ name: 'lead_id', value: String(item.lead.id) }]
              });
            }
            if (res.data?.id) {
              const sentAt = new Date();
              await db.update(leads).set({
                status: 'sent',
                sentAt,
                inviteTokenHash: item.tokenHash,
                resendEmailId: res.data.id,
              }).where(eq(leads.id, item.lead.id));
              sent++;
              (req as any).io?.emit("lead_updated", {
                id: item.lead.id,
                status: 'sent',
                sentAt: sentAt.toISOString()
              });
            } else {
              console.error(`[Lead Send] Error for lead ${item.lead.id}:`, res.error);
              await db.update(leads).set({ status: 'failed' }).where(eq(leads.id, item.lead.id));
            }
          } catch (itemErr) {
            console.error(`[Lead Send] Exception for lead ${item.lead.id}:`, itemErr);
            await db.update(leads).set({ status: 'failed' }).where(eq(leads.id, item.lead.id));
          }
        }
      }

      return res.json({
        success: true,
        sent,
        message: `Successfully processed ${sent} invites.`
      });
    } catch (err: any) {
      console.error("[Leads Send Error]:", err);
      return res.json({ success: false, sent: 0, error: err.message });
    }
  });

router.get("/api-v2/admin/marketing", requireAuth, requireAdmin, async (req, res) => {
    try {
      const logs = await db.select().from(marketing_logs).orderBy(desc(marketing_logs.dateSent));
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/admin/marketing", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { campaignName, targetSegment, messageContent } = req.body;
      const userProfile = await getUserProfile(req.user!.uid);
      
      const newLog = await db.insert(marketing_logs).values({
        authorId: userProfile.id,
        campaignName,
        targetSegment,
        messageContent,
        recipientCount: Math.floor(Math.random() * 500) + 50 // mock count
      }).returning();
      
      res.json({ success: true, log: newLog[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/admin/affiliates", requireAuth, requireAdmin, async (req, res) => {
    try {
      const list = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/admin/affiliates", requireAuth, requireAdmin, async (req, res) => {
    try {
      const newAffiliate = await db.insert(affiliates).values(req.body).returning();
      res.json(newAffiliate[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.patch("/api-v2/admin/affiliates/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await db.update(affiliates).set(req.body).where(eq(affiliates.id, id)).returning();
      res.json(updated[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/admin/test-email", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Use the global resend instance
      const adminEmails = ["ewilliamhe@gmail.com", "ernst@hatake.eu", "phoebe@topbestpkg.com"];
      const showcaseProducts = await db.select().from(products).where(eq(products.approvalStatus, 'approved')).orderBy(desc(products.createdAt)).limit(3);
      
      let productsHtml = '';
      if (showcaseProducts.length > 0) {
        productsHtml = `<div style="margin-top: 40px; margin-bottom: 30px; text-align: left;">
          <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Current Wholesale Opportunities</h2>
          <div style="width: 100%;">`;
          
        for (const p of showcaseProducts) {
          const imgUrl = (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : 'https://placehold.co/150x150/f8fafc/94a3b8?text=Image';
          productsHtml += `
            <div style="display: block; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; background-color: #f8fafc;">
              <table style="width: 100%;" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 100px; vertical-align: top;">
                    <img src="${imgUrl}" alt="${p.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px;" />
                  </td>
                  <td style="padding-left: 16px; vertical-align: top;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b; line-height: 1.4;">${p.title}</h3>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">MOQ: <strong style="color: #0f172a;">${p.moq} units</strong></p>
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #4f46e5;">€${Number(p.unitCost).toFixed(2)} / unit</p>
                  </td>
                </tr>
              </table>
            </div>
          `;
        }
        productsHtml += `</div></div>`;
      }

      const results = [];
      for (const email of adminEmails) {
        const registrationUrl = (process.env.APP_URL || 'https://hatake.shop') + "/login?invite=test-token";
        const htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
            <div style="margin-bottom: 30px; text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; background-color: #4f46e5; color: white; width: 48px; height: 48px; border-radius: 12px; margin-bottom: 12px; font-weight: 900; font-size: 24px;">H</div>
              <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Hatake.Shop</h1>
            </div>
            <div style="background-color: #fffbeb; color: #b45309; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; font-weight: bold;">TEST EMAIL - VERIFYING RESEND CONFIGURATION</div>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px; text-align: left;">Hi Admin Team,<br><br>You have been exclusively invited to join Hatake.Shop, the premier B2B marketplace for Trading Card Game vendors. Connect with verified distributors, access wholesale inventory, and scale your TCG business.</p>
            <a href="${registrationUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Create your company profile</a>
            ${productsHtml}
            <p style="color: #94a3b8; font-size: 14px; margin-top: 32px; text-align: left;">If you have any questions, simply reply to this email.<br>— The Hatake Team</p>
          </div>
        `;

        const response = await resend.emails.send({
          from: "Hatake <onboarding@resend.dev>",
          to: email,
          subject: "Test Invite - Join Hatake.Shop",
          html: htmlContent
        });
        results.push({ email, response });
      }
      res.json({ success: true, results });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/admin/stats", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      const allProducts = await db.select({
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
          approvalStatus: products.approvalStatus,
          createdAt: products.createdAt
      }).from(products).orderBy(desc(products.createdAt)).limit(100);
      
      const userCountRes = await db.select({ count: sql<number>`count(*)` }).from(users);
      const productCountRes = await db.select({ count: sql<number>`count(*)` }).from(products);
      const inquiryCountRes = await db.select({ count: sql<number>`count(*)` }).from(inquiries);
      const allCategories = await db.select().from(categories);

      res.json({
        userCount: userCountRes[0].count,
        productCount: productCountRes[0].count,
        inquiryCount: inquiryCountRes[0].count,
        recentUsers: allUsers,
        recentProducts: allProducts,
        categories: allCategories
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Failed to load admin stats" });
    }
  });

router.post("/api-v2/admin/users", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { email, password, companyName, role } = req.body;
      const uid = 'custom-' + Date.now();
      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
      await db.insert(users).values({
        uid,
        email,
        password: hashedPassword,
        companyName,
        role: role || 'seller',
        verificationStatus: 'verified'
      });
      res.json({ success: true, uid });
    } catch (e: any) {
      console.error("Error creating user:", e);
      res.status(500).json({ error: e.message });
    }
  });

router.patch("/api-v2/admin/users/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role, verificationStatus, companyName, teamOwnerId, email, displayName } = req.body;
      await db.update(users).set({ role, verificationStatus, companyName, teamOwnerId, email, displayName }).where(eq(users.id, userId));
      return res.json({ success: true });

    } catch (err: any) {

      console.error(err);

      res.status(500).json({ error: err.message });

    }

    
  });

router.delete("/api-v2/admin/users/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      // Clean up related data first to avoid foreign key constraints
      await db.delete(inquiryMessages).where(eq(inquiryMessages.senderId, userId));
      await db.delete(inquiries).where(eq(inquiries.buyerId, userId));
      await db.delete(products).where(eq(products.sellerId, userId));
      await db.delete(users).where(eq(users.id, userId));
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      if (!res.headersSent) {
        return res.status(500).json({ error: err.message });
      }
    }

    
  });

router.patch("/api-v2/admin/products/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const { title, description, moq, originType, sellerId, shippingOptions, images, approvalStatus, categoryId, certifications, isSponsored } = req.body;
      const updateData: any = {}; if(title) updateData.title = title; if(description) updateData.description = description; if(moq) updateData.moq = moq; if(originType) updateData.originType = originType; if(sellerId) updateData.sellerId = sellerId; if(shippingOptions) updateData.shippingOptions = shippingOptions; if(images) updateData.images = images; if(certifications) updateData.certifications = certifications; if(approvalStatus) updateData.approvalStatus = approvalStatus; if(categoryId !== undefined) updateData.categoryId = categoryId; if(isSponsored !== undefined) updateData.isSponsored = isSponsored; await db.update(products).set(updateData).where(eq(products.id, productId));
      return res.json({ success: true });

    } catch (err: any) {

      console.error(err);

      res.status(500).json({ error: err.message });

    }

    
  });

router.delete("/api-v2/admin/products/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      await db.delete(inquiries).where(eq(inquiries.targetProductId, productId));
      await db.delete(products).where(eq(products.id, productId));
      return res.json({ success: true });

    } catch (err: any) {

      console.error(err);

      res.status(500).json({ error: err.message });

    }

    
  });


router.get("/api-v2/admin/approvals", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const pendingProducts = await db.select().from(products).where(eq(products.approvalStatus, 'pending'));
    const pendingSellers = await db.select().from(users).where(eq(users.verificationStatus, 'pending')).where(eq(users.role, 'seller'));
    // For pendingUsers name changes, you might need a different table or logic, but we will pass empty array for now
    res.json({ pendingProducts, pendingSellers, pendingUsers: [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api-v2/admin/approvals/sellers/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const sellerId = parseInt(req.params.id, 10);
    const { action } = req.body;
    
    if (action === 'approve') {
      await db.update(users).set({ verificationStatus: 'verified' }).where(eq(users.id, sellerId));
    } else if (action === 'reject') {
      await db.update(users).set({ verificationStatus: 'rejected', role: 'buyer' }).where(eq(users.id, sellerId));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api-v2/admin/approvals/products/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { action } = req.body;
    
    if (action === 'approve') {
      await db.update(products).set({ approvalStatus: 'approved' }).where(eq(products.id, productId));
    } else if (action === 'reject') {
      await db.update(products).set({ approvalStatus: 'rejected' }).where(eq(products.id, productId));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
