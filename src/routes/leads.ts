import { Router } from "express";
import { db, ensureLeadsCrmSchema } from "../db/index.js";
import { leads } from "../db/schema.js";
import { eq, sql, desc, not } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/roles.js";
import { parseLeadGeo } from "../lib/leadGeo.js";

const router = Router();

router.get("/api-v2/leads", async (_req, res) => {
  try {
    await ensureLeadsCrmSchema();
    const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
    res.json(allLeads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/api-v2/leads/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureLeadsCrmSchema();
    const { status, notes, tags, segment } = req.body;
    const { id } = req.params;
    const updatePayload: Record<string, any> = {};
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;
    if (tags !== undefined) updatePayload.tags = Array.isArray(tags) ? tags : [];
    if (segment !== undefined) updatePayload.segment = segment;
    await db.update(leads).set(updatePayload).where(eq(leads.id, parseInt(id, 10)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api-v2/leads/progress", async (_req, res) => {
  try {
    const sentCount = await db.select({ count: sql`count(*)` }).from(leads).where(not(eq(leads.status, 'pending')));
    const totalCount = await db.select({ count: sql`count(*)` }).from(leads);
    res.json({ sentCount: Number(sentCount[0].count), totalGoal: Number(totalCount[0].count) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api-v2/leads/public", async (_req, res) => {
  try {
    await ensureLeadsCrmSchema();
    const allLeads = await db
      .select({
        id: leads.id,
        companyName: leads.companyName,
        website: leads.website,
        location: leads.location,
        country: leads.country,
        state: leads.state,
        city: leads.city,
        socialLinks: leads.socialLinks,
        status: leads.status,
        sentAt: leads.sentAt,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(not(eq(leads.status, 'pending')))
      .orderBy(sql`${leads.sentAt} DESC NULLS LAST, ${leads.createdAt} DESC`);

    const sanitised = allLeads.map(l => {
      const geo = parseLeadGeo({
        country: l.country,
        state: l.state,
        city: l.city,
        location: l.location,
        website: l.website,
      });
      return {
        id: l.id,
        companyName: l.companyName || 'Unknown Company',
        website: l.website ? l.website : null,
        country: geo.country || null,
        state: geo.state || null,
        city: geo.city || null,
        location: geo.location || [geo.city, geo.country].filter(Boolean).join(', ') || null,
        socialLinks: l.socialLinks || [],
        status:
          l.status === 'recruited'
            ? 'registered'
            : l.status === 'clicked' || l.status === 'opened'
            ? 'responded'
            : 'invited',
        sentAt: l.sentAt || l.createdAt,
      };
    });

    res.json({ leads: sanitised, total: sanitised.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api-v2/admin/leads/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureLeadsCrmSchema();
    const {
      email,
      companyName,
      website,
      socialLinks,
      country,
      state,
      city,
      location,
      phone,
      notes,
      tags,
      segment,
      status,
    } = req.body;
    const { id } = req.params;

    const geo = parseLeadGeo({
      country,
      state,
      city,
      location,
      email,
      website,
    });

    const updateSet: Record<string, any> = {
      companyName: companyName ?? null,
      website: website ?? null,
      socialLinks: Array.isArray(socialLinks) ? socialLinks.filter(Boolean) : [],
      country: geo.country,
      state: geo.state,
      city: geo.city,
      location: geo.location,
    };

    if (email && String(email).trim()) {
      updateSet.email = String(email).trim().toLowerCase();
    }
    if (phone !== undefined) updateSet.phone = phone || null;
    if (notes !== undefined) updateSet.notes = notes || null;
    if (tags !== undefined) updateSet.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];
    if (segment !== undefined) updateSet.segment = segment || 'TCG';
    if (status !== undefined) updateSet.status = status;

    await db.update(leads).set(updateSet).where(eq(leads.id, parseInt(id, 10)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api-v2/admin/leads/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureLeadsCrmSchema();
    const id = parseInt(req.params.id, 10);
    await db.delete(leads).where(eq(leads.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
