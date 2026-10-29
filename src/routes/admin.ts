import express, { Router } from "express";
import bcrypt from "bcryptjs";
import { getStripe, getEasyPost, resend, generateEmbedding, ai } from "../lib/services.js";

import { db, ensureSealedTaxonomySchema, ensureSwedishCardShopsSchema, ensureLeadsCrmSchema } from "../db/index.js";
import { adminAuth } from "../lib/firebase-admin.js";
import { users, products, feedback, leads, crmMailSettings, affiliates, marketing_logs, categories, inquiries, inquiryMessages, reviews, swedishCardShops } from "../db/schema.js";
import { findKortbutikerCsvFile, parseSwedishShopsCsv } from "../lib/swedishShops.js";
import fs from "fs";
import path from "path";

import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin, requireSeller } from "../middleware/roles.js";
import crypto from "crypto";
import { generateB2BEmailHtml, buildB2BEmailSubject, B2BMailOptions, sendMembershipApprovedEmail } from "../lib/emailTemplate.js";
import { parseLeadGeo } from "../lib/leadGeo.js";
import { normalizeOriginType } from "../lib/productTaxonomy.js";
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
      await ensureLeadsCrmSchema();
      const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
      const mailRules = await db.select().from(crmMailSettings).orderBy(desc(crmMailSettings.isDefault), asc(crmMailSettings.name));
      const sentCount = await db.select({ count: sql`count(*)` }).from(leads).where(not(eq(leads.status, 'pending')));
      res.json({
        leads: allLeads,
        mailSettings: mailRules,
        sentCount: Number(sentCount[0].count)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export function findPokemonCardStoresCsvFile(): string | null {
  const rootDir = process.cwd();
  try {
    const files = fs.readdirSync(rootDir);
    const match = files.find(f => /^pokemon[_-]card[_-]store.*\.csv$/i.test(f));
    return match ? path.join(rootDir, match) : null;
  } catch (e) {
    return null;
  }
}

export interface LeadImportResult {
  success: boolean;
  added: number;
  duplicates: number;
  total: number;
  duplicateSamples: { email: string; companyName?: string; reason: string }[];
  message: string;
}

export async function importLeadRows(rawLeads: any[], defaultGeo?: { country?: string; state?: string; city?: string }): Promise<LeadImportResult> {
  if (!Array.isArray(rawLeads)) {
    throw new Error("Invalid leads array");
  }
  await ensureLeadsCrmSchema();

  let duplicatesCount = 0;
  const duplicateSamples: { email: string; companyName?: string; reason: string }[] = [];
  const seenEmailsInBatch = new Set<string>();
  const candidates: Array<{
    email: string;
    companyName: string | null;
    website: string | null;
    location: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    phone: string | null;
    notes: string | null;
    tags: string[];
    segment: string;
    socialLinks: string[];
  }> = [];

  for (const rawLead of rawLeads) {
    if (!rawLead || typeof rawLead !== 'object') continue;

    // Clean keys by removing BOM, quotes, and outer whitespace
    const cleanLead: Record<string, any> = {};
    for (const [k, v] of Object.entries(rawLead)) {
      const cleanKey = k.replace(/^[\ufeff\s"']+|["'\s]+$/g, '').trim();
      cleanLead[cleanKey] = v;
    }

    const keys = Object.keys(cleanLead);
    const findKey = (searchStrs: string[]) => keys.find(k => searchStrs.some(s => k.toLowerCase().includes(s)));

    // Look for all keys containing 'email' or 'epost' / 'mail'
    const emailKeys = keys.filter(k => {
      const lk = k.toLowerCase();
      return lk.includes('email') || lk.includes('e-post') || lk === 'mail';
    });
    let email: string | null = null;
    for (const k of emailKeys) {
      let val = cleanLead[k];
      if (val && typeof val === 'string') {
        val = val.replace(/^u003e/i, '').replace(/^[<>\s"']+|[<>\s"']+$/g, '').trim().toLowerCase();
        if (val && val.includes('@') && val.includes('.')) {
          email = val;
          break;
        }
      }
    }

    // Company Name
    const companyKey = findKey(['company', 'business', 'name', 'store', 'butik', 'företag']);
    let companyName = companyKey && cleanLead[companyKey] ? String(cleanLead[companyKey]).trim().substring(0, 255) : null;
    if (companyName) {
      companyName = companyName.replace(/^["']+|["']+$/g, '').trim();
    }

    // If no valid email, skip this row
    if (!email) {
      continue;
    }

    // Check duplicate within the current file / batch
    if (seenEmailsInBatch.has(email)) {
      duplicatesCount++;
      if (duplicateSamples.length < 50) {
        duplicateSamples.push({
          email,
          companyName: companyName || undefined,
          reason: 'Duplicate email within CSV file'
        });
      }
      continue;
    }
    seenEmailsInBatch.add(email);

    // Website
    const websiteKey = findKey(['website', 'url', 'site', 'hemsida', 'webb']);
    const website = websiteKey && cleanLead[websiteKey] ? String(cleanLead[websiteKey]).trim() : null;

    // Phone
    const phoneKey = findKey(['phone', 'tel', 'telefon', 'mobile']);
    const phone = phoneKey && cleanLead[phoneKey] ? String(cleanLead[phoneKey]).trim() : null;

    // Geo (Country, State, City, Location)
    const countryKey = findKey(['country', 'land']);
    const cityKey = findKey(['city', 'stad', 'ort']);
    const stateKey = findKey(['state', 'province', 'region', 'län']);
    const locationKey = findKey(['location']);
    const addressKey = findKey(['address', 'adress']);

    const rawCountry = (countryKey && cleanLead[countryKey] ? String(cleanLead[countryKey]).trim() : null) || defaultGeo?.country || null;
    const rawCity = (cityKey && cleanLead[cityKey] ? String(cleanLead[cityKey]).trim() : null) || defaultGeo?.city || null;
    const rawState = (stateKey && cleanLead[stateKey] ? String(cleanLead[stateKey]).trim() : null) || defaultGeo?.state || null;

    let rawLocation: string | null = null;
    if (locationKey && cleanLead[locationKey]) {
      rawLocation = String(cleanLead[locationKey]).trim();
    } else if (rawCity && rawState) {
      rawLocation = `${rawCity}, ${rawState}`;
    } else if (addressKey && cleanLead[addressKey] && !rawCity) {
      rawLocation = String(cleanLead[addressKey]).trim();
    }

    const geo = parseLeadGeo({
      country: rawCountry,
      state: rawState,
      city: rawCity,
      location: rawLocation,
      email,
      website,
    });

    // Socials
    const socialLinks: string[] = [];
    for (const plat of ["Facebook", "Instagram", "Twitter", "LinkedIn", "YouTube", "TikTok", "Other Socials"]) {
      const match = keys.find(k => k.toLowerCase() === plat.toLowerCase() || k.toLowerCase().includes(plat.toLowerCase()));
      if (match && cleanLead[match] && typeof cleanLead[match] === 'string' && cleanLead[match].trim().startsWith('http')) {
        socialLinks.push(cleanLead[match].trim());
      }
    }

    // Notes & Tags
    const notesKey = findKey(['note', 'anteckning', 'comment']);
    const rawNotes = notesKey && cleanLead[notesKey] ? String(cleanLead[notesKey]).trim() : null;
    const tagsKey = findKey(['tag', 'label']);
    const tags: string[] = tagsKey && cleanLead[tagsKey]
      ? String(cleanLead[tagsKey]).split(/[,;]/).map(s => s.trim()).filter(Boolean)
      : [];

    // Segment
    const segmentKey = findKey(['segment', 'category']);
    const explicitSegment = segmentKey && cleanLead[segmentKey] ? String(cleanLead[segmentKey]).trim() : '';
    let segment = 'TCG';
    if (['TCG', 'Sports', 'General'].includes(explicitSegment)) {
      segment = explicitSegment;
    } else {
      const lowerName = (companyName || '').toLowerCase();
      const combinedStr = lowerName + ' ' + (rawNotes || '').toLowerCase();
      if (combinedStr.includes('sport') || combinedStr.includes('baseball') || combinedStr.includes('basketball') || combinedStr.includes('football')) {
        segment = 'Sports';
      } else {
        segment = 'TCG';
      }
    }

    candidates.push({
      email,
      companyName,
      website,
      location: geo.location,
      country: geo.country,
      state: geo.state,
      city: geo.city,
      phone,
      notes: rawNotes,
      tags,
      segment,
      socialLinks
    });
  }

  if (candidates.length === 0) {
    return {
      success: true,
      added: 0,
      duplicates: duplicatesCount,
      total: rawLeads.length,
      duplicateSamples,
      message: duplicatesCount > 0
        ? `Found 0 new leads. ${duplicatesCount} duplicate lead(s) detected and skipped (not added).`
        : 'No valid leads found in import.'
    };
  }

  // Database deduplication in batches
  const existingDbEmails = new Set<string>();
  const CHUNK_SIZE = 500;
  const allCandidateEmails = candidates.map(c => c.email);

  for (let i = 0; i < allCandidateEmails.length; i += CHUNK_SIZE) {
    const chunk = allCandidateEmails.slice(i, i + CHUNK_SIZE);
    const existing = await db
      .select({ email: leads.email })
      .from(leads)
      .where(inArray(sql`LOWER(${leads.email})`, chunk));
    for (const row of existing) {
      existingDbEmails.add(row.email.toLowerCase().trim());
    }
  }

  // Filter out any candidates that exist in DB
  const leadsToInsert: any[] = [];
  for (const c of candidates) {
    if (existingDbEmails.has(c.email)) {
      duplicatesCount++;
      if (duplicateSamples.length < 50) {
        duplicateSamples.push({
          email: c.email,
          companyName: c.companyName || undefined,
          reason: 'Lead already exists in database'
        });
      }
    } else {
      leadsToInsert.push(c);
    }
  }

  // Insert non-duplicates in batches
  let addedCount = 0;
  for (let i = 0; i < leadsToInsert.length; i += CHUNK_SIZE) {
    const chunk = leadsToInsert.slice(i, i + CHUNK_SIZE);
    const inserted = await db
      .insert(leads)
      .values(chunk)
      .onConflictDoNothing({ target: leads.email })
      .returning({ id: leads.id });
    addedCount += inserted.length;
    if (inserted.length < chunk.length) {
      duplicatesCount += (chunk.length - inserted.length);
    }
  }

  return {
    success: true,
    added: addedCount,
    duplicates: duplicatesCount,
    total: rawLeads.length,
    duplicateSamples,
    message: duplicatesCount > 0
      ? `Imported ${addedCount} new lead${addedCount === 1 ? '' : 's'}. ${duplicatesCount} duplicate${duplicatesCount === 1 ? '' : 's'} detected and skipped (not added).`
      : `Successfully imported ${addedCount} new lead${addedCount === 1 ? '' : 's'}.`
  };
}

router.get(["/admin/leads/available-file", "/api/admin/leads/available-file", "/api-v2/admin/leads/available-file"], requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const filePath = findPokemonCardStoresCsvFile();
    if (!filePath || !fs.existsSync(filePath)) {
      return res.json({ available: false });
    }
    const stat = fs.statSync(filePath);
    res.json({
      available: true,
      filename: path.basename(filePath),
      sizeBytes: stat.size
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(["/admin/leads/sync-file", "/api/admin/leads/sync-file", "/api-v2/admin/leads/sync-file"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const filePath = findPokemonCardStoresCsvFile();
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Ingen Pokemon_Card_Store*.csv fil hittades i /HatakeShop2.0 (No Pokemon_Card_Store*.csv file found in project root)." });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const Papa = (await import('papaparse')).default;
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.replace(/^[\ufeff\s"']+|["'\s]+$/g, '').trim()
    });

    const result = await importLeadRows(parsed.data);
    res.json({
      ...result,
      filename: path.basename(filePath)
    });
  } catch (err: any) {
    console.error("Error syncing leads from file:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api-v2/admin/leads/upload", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { leads: newLeads, defaultCountry, defaultState, defaultCity } = req.body;
    if (!Array.isArray(newLeads)) return res.status(400).json({ error: "Invalid leads array" });
    const result = await importLeadRows(newLeads, {
      country: defaultCountry,
      state: defaultState,
      city: defaultCity,
    });
    res.json(result);
  } catch (err: any) {
    console.error("Error inserting leads:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api-v2/admin/leads/sync-swedish-shops", requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    await ensureSwedishCardShopsSchema();
    await ensureLeadsCrmSchema();
    const shops = await db.select().from(swedishCardShops);
    const mapped = shops
      .filter(s => s.email && s.email.includes('@'))
      .map(s => ({
        "Company Name": s.name,
        "Email": s.email,
        "Website": s.website || '',
        "City": s.city || '',
        "Country": "Sweden",
        "Phone": s.phone || '',
        "Notes": [s.type, s.cardTypes, s.notes].filter(Boolean).join(' • '),
        "Tags": "Sweden,Kortbutik",
      }));
    const result = await importLeadRows(mapped, { country: 'Sweden' });
    res.json({ ...result, source: 'swedish_card_shops' });
  } catch (err: any) {
    console.error("Error syncing Swedish shops to CRM:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api-v2/admin/leads/bulk", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureLeadsCrmSchema();
    const { leadIds, action, status, country, state, city, segment, addTag, removeTag, notes } = req.body || {};
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: "leadIds array is required" });
    }
    const ids = leadIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id));
    if (ids.length === 0) {
      return res.status(400).json({ error: "No valid lead IDs provided" });
    }

    if (action === 'delete') {
      const deleted = await db.delete(leads).where(inArray(leads.id, ids)).returning({ id: leads.id });
      return res.json({ success: true, updated: deleted.length });
    }

    const updateSet: Record<string, any> = {};
    if (status) updateSet.status = status;
    if (country !== undefined) updateSet.country = country || null;
    if (state !== undefined) updateSet.state = state || null;
    if (city !== undefined) updateSet.city = city || null;
    if (city || state || country) {
      const locParts = [city, state || country].filter(Boolean);
      if (locParts.length > 0) updateSet.location = locParts.join(', ');
    }
    if (segment) updateSet.segment = segment;
    if (notes !== undefined) updateSet.notes = notes;

    if (Object.keys(updateSet).length > 0) {
      await db.update(leads).set(updateSet).where(inArray(leads.id, ids));
    }

    if (addTag || removeTag) {
      const rows = await db.select({ id: leads.id, tags: leads.tags }).from(leads).where(inArray(leads.id, ids));
      for (const row of rows) {
        const currentTags = Array.isArray(row.tags) ? [...row.tags] : [];
        let nextTags = currentTags;
        if (addTag && !nextTags.includes(addTag)) {
          nextTags.push(String(addTag).trim());
        }
        if (removeTag) {
          nextTags = nextTags.filter(t => t !== removeTag);
        }
        await db.update(leads).set({ tags: nextTags }).where(eq(leads.id, row.id));
      }
    }

    res.json({ success: true, updated: ids.length });
  } catch (err: any) {
    console.error("Bulk leads update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Geo / Campaign Mail Settings CRUD
router.get("/api-v2/admin/leads/mail-settings", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await ensureLeadsCrmSchema();
    const rules = await db.select().from(crmMailSettings).orderBy(desc(crmMailSettings.isDefault), asc(crmMailSettings.name));
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api-v2/admin/leads/mail-settings", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureLeadsCrmSchema();
    const body = req.body || {};
    if (body.isDefault) {
      await db.update(crmMailSettings).set({ isDefault: false });
    }
    const inserted = await db.insert(crmMailSettings).values({
      name: body.name || 'Custom Geo Rule',
      country: body.country || null,
      state: body.state || null,
      city: body.city || null,
      segment: body.segment || null,
      language: body.language || 'en',
      senderName: body.senderName || 'Hatake B2B',
      replyTo: body.replyTo || 'ernst@hatake.eu',
      subjectTemplate: body.subjectTemplate || '{{companyName}}, join Hatake.Shop B2B',
      headlineTemplate: body.headlineTemplate || null,
      introTemplate: body.introTemplate || null,
      regionalNote: body.regionalNote || null,
      ctaText: body.ctaText || null,
      batchSize: Number(body.batchSize) || 50,
      isDefault: Boolean(body.isDefault),
      updatedAt: new Date(),
    }).returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api-v2/admin/leads/mail-settings/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureLeadsCrmSchema();
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    if (body.isDefault) {
      await db.update(crmMailSettings).set({ isDefault: false });
    }
    const updated = await db.update(crmMailSettings).set({
      name: body.name || 'Custom Geo Rule',
      country: body.country || null,
      state: body.state || null,
      city: body.city || null,
      segment: body.segment || null,
      language: body.language || 'en',
      senderName: body.senderName || 'Hatake B2B',
      replyTo: body.replyTo || 'ernst@hatake.eu',
      subjectTemplate: body.subjectTemplate || '{{companyName}}, join Hatake.Shop B2B',
      headlineTemplate: body.headlineTemplate || null,
      introTemplate: body.introTemplate || null,
      regionalNote: body.regionalNote || null,
      ctaText: body.ctaText || null,
      batchSize: Number(body.batchSize) || 50,
      isDefault: Boolean(body.isDefault),
      updatedAt: new Date(),
    }).where(eq(crmMailSettings.id, id)).returning();
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api-v2/admin/leads/mail-settings/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureLeadsCrmSchema();
    const id = parseInt(req.params.id, 10);
    await db.delete(crmMailSettings).where(eq(crmMailSettings.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function matchBestMailRule(lead: any, rules: any[]) {
  if (!rules || rules.length === 0) return null;
  const lCountry = (lead.country || '').trim().toLowerCase();
  const lState = (lead.state || '').trim().toLowerCase();
  const lCity = (lead.city || '').trim().toLowerCase();
  const lSegment = (lead.segment || 'TCG').trim().toLowerCase();

  let bestRule: any = null;
  let bestScore = -1;

  for (const r of rules) {
    const rCountry = (r.country || '').trim().toLowerCase();
    const rState = (r.state || '').trim().toLowerCase();
    const rCity = (r.city || '').trim().toLowerCase();
    const rSegment = (r.segment || '').trim().toLowerCase();

    if (rCountry && rCountry !== lCountry) continue;
    if (rState && rState !== lState) continue;
    if (rCity && rCity !== lCity) continue;
    if (rSegment && rSegment !== lSegment) continue;

    let score = 0;
    if (rCity) score += 8;
    if (rState) score += 4;
    if (rCountry) score += 2;
    if (rSegment) score += 1;
    if (score === 0 && r.isDefault) score = 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestRule = r;
    }
  }

  return bestRule || rules.find(r => r.isDefault) || rules[0];
}

router.get("/api-v2/admin/leads/preview", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const appUrl = process.env.APP_URL || 'https://hatake.shop';
      const registrationUrl = `${appUrl}/register?invite=preview-token-demo`;
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=demo@example.com`;
      const htmlContent = generateB2BEmailHtml("Acme TCG Corp", registrationUrl, unsubscribeUrl, "TCG");
      res.json({ html: htmlContent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/admin/leads/preview", requireAuth, requireAdmin, async (req, res) => {
    try {
      await ensureLeadsCrmSchema();
      const { lead, mailSettings, useAutoGeoRule } = req.body || {};
      const sampleLead = lead || {
        companyName: 'Nordic Card Vault',
        city: 'Stockholm',
        state: 'Stockholm',
        country: 'Sweden',
        location: 'Stockholm, Sweden',
        segment: 'TCG',
        email: 'demo@example.com',
      };

      let effectiveSettings = mailSettings || null;
      if (useAutoGeoRule || !effectiveSettings) {
        const rules = await db.select().from(crmMailSettings);
        effectiveSettings = matchBestMailRule(sampleLead, rules) || effectiveSettings || {};
      }

      const appUrl = process.env.APP_URL || 'https://hatake.shop';
      const registrationUrl = `${appUrl}/register?invite=preview-token-demo`;
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(sampleLead.email || 'demo@example.com')}`;

      const mailOpts: B2BMailOptions = {
        language: effectiveSettings?.language || 'en',
        senderName: effectiveSettings?.senderName || 'Hatake B2B',
        replyTo: effectiveSettings?.replyTo || process.env.RESEND_REPLY_TO || 'ernst@hatake.eu',
        subjectTemplate: effectiveSettings?.subjectTemplate,
        headlineTemplate: effectiveSettings?.headlineTemplate,
        introTemplate: effectiveSettings?.introTemplate,
        regionalNote: effectiveSettings?.regionalNote,
        ctaText: effectiveSettings?.ctaText,
        city: sampleLead.city,
        state: sampleLead.state,
        country: sampleLead.country,
        location: sampleLead.location,
      };

      const subject = buildB2BEmailSubject(
        effectiveSettings?.subjectTemplate,
        {
          companyName: sampleLead.companyName || 'Partner',
          city: sampleLead.city,
          state: sampleLead.state,
          country: sampleLead.country,
          location: sampleLead.location,
          segment: sampleLead.segment || 'TCG',
        },
        mailOpts.language || 'en'
      );

      const htmlContent = generateB2BEmailHtml(
        sampleLead.companyName || 'Partner',
        registrationUrl,
        unsubscribeUrl,
        sampleLead.segment || 'TCG',
        mailOpts
      );

      res.json({
        subject,
        senderName: mailOpts.senderName,
        replyTo: mailOpts.replyTo,
        matchedRuleName: effectiveSettings?.name || 'Custom Settings',
        html: htmlContent,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/admin/leads/send", requireAuth, requireAdmin, async (req, res) => {
    try {
      await ensureLeadsCrmSchema();
      const {
        limit = 50,
        leadIds,
        filters,
        mailSettings,
        useAutoGeoRules = true,
      } = req.body || {};

      const numLimit = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
      let pendingLeads: any[] = [];

      if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
        const cleanIds = leadIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id));
        pendingLeads = await db.select().from(leads).where(inArray(leads.id, cleanIds));
      } else {
        const conditions: any[] = [eq(leads.status, 'pending')];
        if (filters && typeof filters === 'object') {
          if (filters.country && filters.country !== 'all') {
            conditions.push(eq(leads.country, String(filters.country)));
          }
          if (filters.state && filters.state !== 'all') {
            conditions.push(eq(leads.state, String(filters.state)));
          }
          if (filters.city && filters.city !== 'all') {
            conditions.push(eq(leads.city, String(filters.city)));
          }
          if (filters.segment && filters.segment !== 'all') {
            conditions.push(eq(leads.segment, String(filters.segment)));
          }
          if (filters.search && String(filters.search).trim()) {
            const q = `%${String(filters.search).trim()}%`;
            conditions.push(
              or(
                ilike(leads.companyName, q),
                ilike(leads.email, q),
                ilike(leads.city, q),
                ilike(leads.location, q)
              )
            );
          }
        }
        pendingLeads = await db
          .select()
          .from(leads)
          .where(and(...conditions))
          .orderBy(desc(leads.createdAt))
          .limit(numLimit);
      }

      // Filter out any rows missing a valid email
      pendingLeads = pendingLeads.filter(l => l.email && l.email.includes('@'));

      if (pendingLeads.length === 0) {
        return res.json({ success: true, sent: 0, message: "No matching leads found to send" });
      }

      const savedRules = await db.select().from(crmMailSettings);
      const defaultReplyTo = process.env.RESEND_REPLY_TO || "ernst@hatake.eu";
      const appUrl = process.env.APP_URL || 'https://hatake.shop';

      const emailPayloads = pendingLeads.map(lead => {
        const matchedRule = useAutoGeoRules ? matchBestMailRule(lead, savedRules) : null;
        const activeCfg = mailSettings && !useAutoGeoRules
          ? mailSettings
          : mailSettings && mailSettings.overrideAll
          ? mailSettings
          : matchedRule || mailSettings || {};

        const senderDisplay = String(activeCfg.senderName || 'Hatake B2B').replace(/[<>"]/g, '').trim() || 'Hatake B2B';
        const replyToAddr = String(activeCfg.replyTo || defaultReplyTo).trim() || defaultReplyTo;
        const lang = activeCfg.language || 'en';

        const rawToken = crypto.randomUUID();
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const registrationUrl = `${appUrl}/register?invite=${rawToken}`;
        const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(lead.email)}`;

        const mailOpts: B2BMailOptions = {
          language: lang,
          senderName: senderDisplay,
          replyTo: replyToAddr,
          subjectTemplate: activeCfg.subjectTemplate,
          headlineTemplate: activeCfg.headlineTemplate,
          introTemplate: activeCfg.introTemplate,
          regionalNote: activeCfg.regionalNote,
          ctaText: activeCfg.ctaText,
          city: lead.city,
          state: lead.state,
          country: lead.country,
          location: lead.location,
        };

        const htmlContent = generateB2BEmailHtml(
          lead.companyName || "Partner",
          registrationUrl,
          unsubscribeUrl,
          lead.segment || "TCG",
          mailOpts
        );

        const subject = buildB2BEmailSubject(
          activeCfg.subjectTemplate,
          {
            companyName: lead.companyName || 'Partner',
            city: lead.city,
            state: lead.state,
            country: lead.country,
            location: lead.location,
            segment: lead.segment || 'TCG',
          },
          lang
        );

        return {
          lead,
          rawToken,
          tokenHash,
          htmlContent,
          subject,
          primaryFrom: `${senderDisplay} <b2b@hatake.shop>`,
          fallbackFrom: `${senderDisplay} <hello@hatake.shop>`,
          replyToAddr,
        };
      });

      let sent = 0;
      let batchItems = emailPayloads.map(p => ({
        from: p.primaryFrom,
        to: [p.lead.email],
        replyTo: p.replyToAddr,
        subject: p.subject,
        html: p.htmlContent,
        tags: [{ name: 'lead_id', value: String(p.lead.id) }]
      }));

      let batchRes: any = null;
      try {
        batchRes = await resend.batch.send(batchItems);
        if (batchRes.error && (batchRes.error.message?.includes('not verified') || batchRes.error.statusCode === 403)) {
          console.warn(`[Batch Send] Domain b2b@hatake.shop not verified, falling back to hello@hatake.shop`);
          batchItems = emailPayloads.map(p => ({
            from: p.fallbackFrom,
            to: [p.lead.email],
            replyTo: p.replyToAddr,
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
            lastEmailedAt: sentAt,
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
            let resMail = await resend.emails.send({
              from: item.primaryFrom,
              to: item.lead.email,
              replyTo: item.replyToAddr,
              subject: item.subject,
              html: item.htmlContent,
              tags: [{ name: 'lead_id', value: String(item.lead.id) }]
            });
            if (resMail.error && (resMail.error.message?.includes('not verified') || resMail.error.statusCode === 403)) {
              resMail = await resend.emails.send({
                from: item.fallbackFrom,
                to: item.lead.email,
                replyTo: item.replyToAddr,
                subject: item.subject,
                html: item.htmlContent,
                tags: [{ name: 'lead_id', value: String(item.lead.id) }]
              });
            }
            if (resMail.data?.id) {
              const sentAt = new Date();
              await db.update(leads).set({
                status: 'sent',
                sentAt,
                lastEmailedAt: sentAt,
                inviteTokenHash: item.tokenHash,
                resendEmailId: resMail.data?.id,
              }).where(eq(leads.id, item.lead.id));
              sent++;
              (req as any).io?.emit("lead_updated", {
                id: item.lead.id,
                status: 'sent',
                sentAt: sentAt.toISOString()
              });
            } else {
              console.error(`[Lead Send] Error for lead ${item.lead.id}:`, resMail.error);
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
        message: `Successfully dispatched ${sent} personalized B2B invitation${sent === 1 ? '' : 's'}.`
      });
    } catch (err: any) {
      console.error("[Leads Send Error]:", err);
      return res.status(500).json({ success: false, sent: 0, error: err.message });
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
      await ensureSealedTaxonomySchema();
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
          oemMoq: products.oemMoq,
          stockQuantity: products.stockQuantity,
          unitCost: products.unitCost,
          tieredPricing: products.tieredPricing,
          originType: products.originType,
          leadTimeDays: products.leadTimeDays,
          shippingOptions: products.shippingOptions,
          images: products.images,
          language: products.language,
          sealedType: products.sealedType,
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
      const { 
        role, verificationStatus, companyName, teamOwnerId, email, displayName,
        orgNumber, website, aboutUs, country, region, companyFocus, vatNumber,
        profilePictureUrl, bannerUrl
      } = req.body;
      
      const [existingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const prevStatus = existingUser?.verificationStatus;

      const updateData: any = {};
      if (role !== undefined) updateData.role = role;
      if (verificationStatus !== undefined) updateData.verificationStatus = verificationStatus;
      if (companyName !== undefined) updateData.companyName = companyName;
      if (teamOwnerId !== undefined) updateData.teamOwnerId = teamOwnerId;
      if (email !== undefined) updateData.email = email;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (orgNumber !== undefined) updateData.orgNumber = orgNumber;
      if (website !== undefined) updateData.website = website;
      if (aboutUs !== undefined) updateData.aboutUs = aboutUs;
      if (country !== undefined) updateData.country = country;
      if (region !== undefined) updateData.region = region;
      if (companyFocus !== undefined) updateData.companyFocus = companyFocus;
      if (vatNumber !== undefined) updateData.vatNumber = vatNumber;
      if (profilePictureUrl !== undefined) updateData.profilePictureUrl = profilePictureUrl;
      if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;

      // Update the user
      await db.update(users).set(updateData).where(eq(users.id, userId));

      // Re-fetch the user to see their current team
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      // Trigger membership verified email if status transitioned from pending to verified
      if (
        prevStatus === 'pending' &&
        verificationStatus &&
        (verificationStatus === 'verified' || ['verified', 'certified', 'elite'].includes(verificationStatus)) &&
        existingUser
      ) {
        await sendMembershipApprovedEmail({
          id: existingUser.id,
          email: updateData.email || existingUser.email,
          companyName: updateData.companyName || existingUser.companyName,
          displayName: updateData.displayName || existingUser.displayName,
          supplierTier: targetUser[0]?.supplierTier || 'Verified Supplier',
          inviteCode: targetUser[0]?.inviteCode || existingUser.inviteCode,
          appUrl: process.env.APP_URL || 'https://hatake.shop'
        });
      }

      // Sync company profile fields if applicable
      if (targetUser.length > 0) {
        // If the admin is actively changing the teamOwnerId, we shouldn't overwrite the entire team's data with this user's data!
        // Instead, the new team member should inherit the parent's data. 
        if (teamOwnerId !== undefined && teamOwnerId !== (targetUser[0].teamOwnerId)) {
             // Handle joining team logic (admin changing teamOwnerId explicitly)
             const parent = await db.select().from(users).where(eq(users.id, targetUser[0].teamOwnerId || targetUser[0].id)).limit(1);
             if (parent.length > 0) {
                await db.update(users).set({
                    companyName: parent[0].companyName,
                    orgNumber: parent[0].orgNumber,
                    website: parent[0].website,
                    aboutUs: parent[0].aboutUs,
                    country: parent[0].country,
                    region: parent[0].region,
                    companyFocus: parent[0].companyFocus,
                    vatNumber: parent[0].vatNumber,
                    profilePictureUrl: parent[0].profilePictureUrl,
                    bannerUrl: parent[0].bannerUrl
                }).where(eq(users.id, userId));
             }
        } else {
            // Normal sync: propagate company field edits to the rest of the team
            const parentId = targetUser[0].teamOwnerId || targetUser[0].id;
            
            const companyFields: any = {};
            if (companyName !== undefined) companyFields.companyName = companyName;
            if (orgNumber !== undefined) companyFields.orgNumber = orgNumber;
            if (website !== undefined) companyFields.website = website;
            if (aboutUs !== undefined) companyFields.aboutUs = aboutUs;
            if (country !== undefined) companyFields.country = country;
            if (region !== undefined) companyFields.region = region;
            if (companyFocus !== undefined) companyFields.companyFocus = companyFocus;
            if (vatNumber !== undefined) companyFields.vatNumber = vatNumber;
            if (profilePictureUrl !== undefined) companyFields.profilePictureUrl = profilePictureUrl;
            if (bannerUrl !== undefined) companyFields.bannerUrl = bannerUrl;
            
            if (Object.keys(companyFields).length > 0) {
              await db.update(users).set(companyFields).where(eq(users.id, parentId));
              await db.update(users).set(companyFields).where(eq(users.teamOwnerId, parentId));
            }
        }
      }
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

router.patch(["/admin/products/:id", "/api/admin/products/:id", "/api-v2/admin/products/:id"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      await ensureSealedTaxonomySchema();
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) return res.status(400).json({ error: "Invalid product id" });
      const { title, description, moq, oemMoq, originType, sellerId, shippingOptions, images, approvalStatus, categoryId, categoryIds, certifications, isSponsored, language, sealedType, productType } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (moq !== undefined) {
        const parsedMoq = parseInt(String(moq), 10);
        if (!isNaN(parsedMoq) && parsedMoq > 0) updateData.moq = parsedMoq;
      }
      if (oemMoq !== undefined) {
        const parsedOem = parseInt(String(oemMoq), 10);
        updateData.oemMoq = isNaN(parsedOem) ? null : parsedOem;
      }
      if (originType !== undefined) {
        const normalized = normalizeOriginType(originType);
        if (!normalized) return res.status(400).json({ error: "originType cannot be empty" });
        updateData.originType = normalized;
      }
      if (sellerId !== undefined) {
        const parsedSeller = parseInt(String(sellerId), 10);
        if (!isNaN(parsedSeller)) updateData.sellerId = parsedSeller;
      }
      if (shippingOptions !== undefined) updateData.shippingOptions = shippingOptions;
      if (images !== undefined) updateData.images = images;
      if (certifications !== undefined) updateData.certifications = certifications;
      if (approvalStatus !== undefined) updateData.approvalStatus = approvalStatus;
      if (categoryId !== undefined) {
        const parsedCat = parseInt(String(categoryId), 10);
        updateData.categoryId = isNaN(parsedCat) ? null : parsedCat;
      }
      if (Array.isArray(categoryIds)) {
        updateData.categoryIds = categoryIds;
        if (categoryIds.length > 0) {
          const first = parseInt(String(categoryIds[0]), 10);
          if (!isNaN(first)) updateData.categoryId = first;
        }
      }
      if (isSponsored !== undefined) updateData.isSponsored = isSponsored;
      if (language !== undefined) updateData.language = language || null;
      if (sealedType !== undefined) updateData.sealedType = sealedType || null;
      if (productType !== undefined) updateData.productType = productType || null;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid updates provided" });
      }
      await db.update(products).set(updateData).where(eq(products.id, productId));
      return res.json({ success: true, updates: updateData });

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



router.get("/api-v2/admin/products", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allProducts = await db.select({
      product: products,
      seller: users
    }).from(products).leftJoin(users, eq(products.sellerId, users.id)).orderBy(desc(products.createdAt));
    res.json(allProducts.map(p => ({ ...p.product, seller: p.seller })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch(["/admin/products/bulk", "/api/admin/products/bulk", "/api-v2/admin/products/bulk"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureSealedTaxonomySchema();
    const { productIds, updates } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "No productIds provided" });
    }

    const updateData: any = {};
    if (updates.categoryId !== undefined) {
      const parsedCat = parseInt(String(updates.categoryId), 10);
      updateData.categoryId = isNaN(parsedCat) ? null : parsedCat;
    }
    if (Array.isArray(updates.categoryIds)) {
      updateData.categoryIds = updates.categoryIds;
      if (updates.categoryIds.length > 0) {
        // keep the legacy single category_id in sync with the first entry
        const first = parseInt(String(updates.categoryIds[0]), 10);
        if (!isNaN(first)) updateData.categoryId = first;
      }
    }
    if (updates.isSponsored !== undefined) updateData.isSponsored = updates.isSponsored;
    if (updates.approvalStatus !== undefined) updateData.approvalStatus = updates.approvalStatus;
    if (updates.language !== undefined) updateData.language = updates.language || null;
    if (updates.sealedType !== undefined) updateData.sealedType = updates.sealedType || null;
    if (updates.productType !== undefined) updateData.productType = updates.productType || null;
    if (updates.originType !== undefined) {
      const normalized = normalizeOriginType(updates.originType);
      if (!normalized) {
        return res.status(400).json({ error: "originType cannot be empty" });
      }
      updateData.originType = normalized;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid updates provided" });
    }

    await db.update(products).set(updateData).where(inArray(products.id, productIds));
    res.json({ success: true, updatedCount: productIds.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api-v2/admin/approvals", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const pendingProducts = await db.select().from(products).where(eq(products.approvalStatus, 'pending'));
    const pendingSellers = await db.select().from(users).where(eq(users.verificationStatus, 'pending'));
    // For pendingUsers name changes, you might need a different table or logic, but we will pass empty array for now
    res.json({ pendingProducts, pendingSellers, pendingUsers: [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api-v2/admin/approvals/sellers/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const sellerId = parseInt(req.params.id, 10);
    const { action, tier } = req.body; // action can be 'approve', 'reject', 'set_tier'
    
    const [seller] = await db.select().from(users).where(eq(users.id, sellerId)).limit(1);
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    const prevStatus = seller.verificationStatus;
    let nextStatus: string | null = null;
    let newTier = seller.supplierTier || 'Verified Supplier';

    if (action === 'set_tier' && tier) {
       nextStatus = tier;
       newTier = tier === 'verified' ? 'Verified Supplier' : tier;
       await db.update(users).set({ verificationStatus: tier, supplierTier: newTier }).where(eq(users.id, sellerId));
    } else if (action === 'approve') {
       nextStatus = 'verified';
       newTier = 'Verified Supplier';
       await db.update(users).set({ verificationStatus: 'verified', supplierTier: 'Verified Supplier' }).where(eq(users.id, sellerId));
    } else if (action === 'reject') {
       nextStatus = 'rejected';
       await db.update(users).set({ verificationStatus: 'rejected', role: 'buyer' }).where(eq(users.id, sellerId));
    }

    if (prevStatus === 'pending' && (nextStatus === 'verified' || ['verified', 'certified', 'elite'].includes(nextStatus || ''))) {
       await sendMembershipApprovedEmail({
         id: seller.id,
         email: seller.email,
         companyName: seller.companyName,
         displayName: seller.displayName,
         supplierTier: newTier,
         inviteCode: seller.inviteCode,
         appUrl: process.env.APP_URL || 'https://hatake.shop'
       });
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api-v2/admin/test-membership-approved-email", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, companyName, tier, inviteCode } = req.body;
    const targetEmail = email || req.user?.email || "ernst@hatake.eu";
    const result = await sendMembershipApprovedEmail({
      email: targetEmail,
      companyName: companyName || "Hatake Partner Store",
      displayName: "Valued Partner",
      supplierTier: tier || "Verified Supplier",
      inviteCode: inviteCode || "SEC-DDBZASO4",
      appUrl: process.env.APP_URL || 'https://hatake.shop'
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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


// Impersonate a user
router.post(['/admin/impersonate/:id', '/api/admin/impersonate/:id', '/api-v2/admin/impersonate/:id'], requireAdmin, async (req, res) => {
  try {
    const { users } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    
    const targetUser = await db.select().from(users).where(eq(users.id, parseInt(req.params.id))).limit(1);
    
    if (!targetUser.length) return res.status(404).json({ error: 'User not found' });
    
    const customToken = await adminAuth.createCustomToken(targetUser[0].uid);
    res.json({ token: customToken });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.patch("/api-v2/admin/products/:id/sverige", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    if (!userProfile || userProfile.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const productId = parseInt(req.params.id);
    const { isSverigeB2c, sverigeTitle, sverigePrice, sverigeImages } = req.body;
    const updates: any = {};
    if (isSverigeB2c !== undefined) updates.isSverigeB2c = isSverigeB2c;
    if (sverigeTitle !== undefined) updates.sverigeTitle = sverigeTitle;
    if (sverigePrice !== undefined) updates.sverigePrice = sverigePrice;
    if (sverigeImages !== undefined) updates.sverigeImages = sverigeImages;
    
    if (Object.keys(updates).length > 0) {
      await db.update(products).set(updates).where(eq(products.id, productId));
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- KORT BUTIKER SVERIGE (Swedish Card Shops) ENDPOINTS ---
router.get(["/admin/kort-butiker", "/api/admin/kort-butiker", "/api-v2/admin/kort-butiker"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureSwedishCardShopsSchema();
    const shops = await db.select().from(swedishCardShops).orderBy(asc(swedishCardShops.name));
    res.json(shops);
  } catch (err: any) {
    console.error("Error fetching swedish card shops:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/admin/kort-butiker", "/api/admin/kort-butiker", "/api-v2/admin/kort-butiker"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureSwedishCardShopsSchema();
    const { name, type, city, address, phone, email, website, cardTypes, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Butiksnamn är obligatoriskt (Store name is required)" });
    }

    const inserted = await db.insert(swedishCardShops).values({
      name: name.trim(),
      type: type ? type.trim() : 'Fysisk butik',
      city: city ? city.trim() : '',
      address: address ? address.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      website: website ? website.trim() : '',
      cardTypes: cardTypes ? cardTypes.trim() : '',
      notes: notes ? notes.trim() : '',
      updatedAt: new Date(),
    }).returning();

    res.status(201).json(inserted[0]);
  } catch (err: any) {
    console.error("Error adding swedish card shop:", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch(["/admin/kort-butiker/:id", "/api/admin/kort-butiker/:id", "/api-v2/admin/kort-butiker/:id"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, type, city, address, phone, email, website, cardTypes, notes } = req.body;
    const updates: any = { updatedAt: new Date() };

    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type.trim();
    if (city !== undefined) updates.city = city.trim();
    if (address !== undefined) updates.address = address.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email.trim();
    if (website !== undefined) updates.website = website.trim();
    if (cardTypes !== undefined) updates.cardTypes = cardTypes.trim();
    if (notes !== undefined) updates.notes = notes.trim();

    const updated = await db.update(swedishCardShops).set(updates).where(eq(swedishCardShops.id, id)).returning();
    if (!updated.length) return res.status(404).json({ error: "Store not found" });

    res.json(updated[0]);
  } catch (err: any) {
    console.error("Error updating swedish card shop:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete(["/admin/kort-butiker/:id", "/api/admin/kort-butiker/:id", "/api-v2/admin/kort-butiker/:id"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(swedishCardShops).where(eq(swedishCardShops.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Error deleting swedish card shop:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/admin/kort-butiker/sync-file", "/api/admin/kort-butiker/sync-file", "/api-v2/admin/kort-butiker/sync-file"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureSwedishCardShopsSchema();
    const filePath = findKortbutikerCsvFile();
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Ingen kort_butiker_sverige*.csv fil hittades i projektet." });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const shops = parseSwedishShopsCsv(content);
    let count = 0;
    for (const s of shops) {
      const existing = await db.select().from(swedishCardShops).where(eq(swedishCardShops.name, s.name)).limit(1);
      if (existing.length === 0) {
        await db.insert(swedishCardShops).values({
          name: s.name,
          type: s.type || 'Fysisk butik',
          city: s.city || '',
          address: s.address || '',
          phone: s.phone || '',
          email: s.email || '',
          website: s.website || '',
          cardTypes: s.cardTypes || '',
          notes: s.notes || '',
        });
        count++;
      }
    }

    res.json({ success: true, added: count, totalInFile: shops.length, file: path.basename(filePath) });
  } catch (err: any) {
    console.error("Error syncing swedish card shops from file:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/admin/kort-butiker/import-csv", "/api/admin/kort-butiker/import-csv", "/api-v2/admin/kort-butiker/import-csv"], requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await ensureSwedishCardShopsSchema();
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: "No CSV data provided" });
    }

    const shops = parseSwedishShopsCsv(csvData);
    let count = 0;
    for (const s of shops) {
      if (!s.name) continue;
      const existing = await db.select().from(swedishCardShops).where(eq(swedishCardShops.name, s.name)).limit(1);
      if (existing.length === 0) {
        await db.insert(swedishCardShops).values({
          name: s.name,
          type: s.type || 'Fysisk butik',
          city: s.city || '',
          address: s.address || '',
          phone: s.phone || '',
          email: s.email || '',
          website: s.website || '',
          cardTypes: s.cardTypes || '',
          notes: s.notes || '',
        });
        count++;
      }
    }

    res.json({ success: true, added: count, parsed: shops.length });
  } catch (err: any) {
    console.error("Error importing CSV:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
