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

router.get("/api-v2/leads", async (req, res) => {
    try {
      const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
      res.json(allLeads);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.patch("/api-v2/leads/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
       const { status } = req.body;
       const { id } = req.params;
       await db.update(leads).set({ status }).where(eq(leads.id, parseInt(id)));
       res.json({ success: true });
    } catch (err) {
       res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/leads/progress", async (req, res) => {
    try {
      const sentCount = await db.select({ count: sql`count(*)` }).from(leads).where(not(eq(leads.status, 'pending')));
      const totalCount = await db.select({ count: sql`count(*)` }).from(leads);
      res.json({ sentCount: Number(sentCount[0].count), totalGoal: Number(totalCount[0].count) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.get("/api-v2/leads/public", async (req, res) => {
  try {
    const allLeads = await db
      .select({
        id: leads.id,
        companyName: leads.companyName,
        website: leads.website,
        location: leads.location,
        socialLinks: leads.socialLinks,
        status: leads.status,
        sentAt: leads.sentAt,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(not(eq(leads.status, 'pending')))
      .orderBy(sql`${leads.sentAt} DESC NULLS LAST, ${leads.createdAt} DESC`);

    const sanitised = allLeads.map(l => ({
      id: l.id,
      companyName: l.companyName || 'Unknown Company',
      website: l.website ? l.website : null,
      location: l.location || null,
      socialLinks: l.socialLinks || [],
      status: l.status === 'recruited' ? 'registered' : l.status === 'clicked' || l.status === 'opened' ? 'responded' : 'invited',
      sentAt: l.sentAt || l.createdAt,
    }));

    res.json({ leads: sanitised, total: sanitised.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


router.put("/api-v2/admin/leads/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
       const { email, companyName, website, socialLinks } = req.body;
       const { id } = req.params;
       await db.update(leads).set({ 
         email: email || undefined,
         companyName,
         website,
         socialLinks
       }).where(eq(leads.id, parseInt(id)));
       res.json({ success: true });
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
});

export default router;
