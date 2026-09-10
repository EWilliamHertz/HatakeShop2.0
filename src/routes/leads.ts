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
      res.json({ sentCount: Number(sentCount[0].count), totalGoal: 20000 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
