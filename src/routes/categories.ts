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

router.get("/api-v2/categories", async (req, res) => {
    try {
      const allCategories = await db.select().from(categories).orderBy(categories.sortOrder);
      res.json(allCategories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/categories", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user.uid);
      if (userProfile?.role !== 'admin') return res.status(403).send("Forbidden");
      
      const { name, slug, parentId, sortOrder, isVisibleIfEmpty } = req.body;
      if (!name || !slug) return res.status(400).send("Name and slug required");
      
      const newCat = await db.insert(categories).values({ name, slug, parentId, sortOrder: sortOrder || 0, isVisibleIfEmpty: isVisibleIfEmpty || false }).returning();
      res.json(newCat[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.patch("/api-v2/categories/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user.uid);
      if (userProfile?.role !== 'admin') return res.status(403).send("Forbidden");
      
      const id = parseInt(req.params.id, 10);
      const { name, slug, parentId, sortOrder, isVisibleIfEmpty } = req.body;
      
      const updated = await db.update(categories).set({ name, slug, parentId, sortOrder, isVisibleIfEmpty }).where(eq(categories.id, id)).returning();
      res.json(updated[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.delete("/api-v2/categories/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user.uid);
      if (userProfile?.role !== 'admin') return res.status(403).send("Forbidden");
      
      const id = parseInt(req.params.id, 10);
      await db.delete(categories).where(eq(categories.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
