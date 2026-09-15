import bcrypt from "bcryptjs";
import express from "express";
import { getStripe, getEasyPost, resend, generateEmbedding, ai } from "../lib/services.js";

import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, feedback, leads, affiliates, marketing_logs, categories, inquiries, inquiryMessages, reviews } from "../db/schema.js";
import { eq, or, ilike, sql, and, desc, isNotNull, isNull, inArray, ne, not, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin, requireSeller } from "../middleware/roles.js";
import crypto from "crypto";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
import { getUserProfile, getOrCreateUser } from "../db/users.js";

const router = Router();

router.post("/api-v2/auth/custom-login", async (req: AuthRequest, res) => {
    try {
      const { email, password } = req.body;
      const dbUsers = await db.select().from(users).where(eq(users.email, email));
      if (dbUsers.length > 0 && dbUsers[0].password) {
         const isValid = await bcrypt.compare(password, dbUsers[0].password);
         if (isValid) {
           return res.json({ token: `custom-token-${dbUsers[0].uid}` });
         }
      }


      res.status(401).json({ error: "Invalid credentials." });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

router.post("/api-v2/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).send("Unauthorized");
      
      const { inviteToken } = req.body || {};
      
      let finalCompanyName = "";
      if (inviteToken) {
         if (inviteToken.startsWith("SEC-")) {
            const ownerQuery = await db.select().from(users).where(eq(users.inviteCode, inviteToken)).limit(1);
            if (ownerQuery.length > 0) {
               const owner = ownerQuery[0];
               const user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name);
               if (user.id !== owner.id) {
                  await db.update(users).set({
                     teamOwnerId: owner.id,
                     companyName: owner.companyName,
                     role: owner.role,
                     country: owner.country,
                     verificationStatus: owner.verificationStatus,
                     teamRole: 'sales_rep'
                  }).where(eq(users.id, user.id));
                  user.companyName = owner.companyName;
                  user.teamOwnerId = owner.id;
                  user.role = owner.role;
                  user.verificationStatus = owner.verificationStatus;
                  user.teamRole = 'sales_rep';
                  return res.json({ user });
               }
            }
         }
         
         const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
         const lead = await db.select().from(leads).where(eq(leads.inviteTokenHash, tokenHash)).limit(1);
         if (lead.length > 0 && lead[0].status !== 'recruited') {
            finalCompanyName = lead[0].companyName || "";
            const redeemedAt = new Date();
            await db.update(leads).set({ status: 'recruited', redeemedAt }).where(eq(leads.id, lead[0].id));
            (req as any).io?.emit("lead_updated", { id: lead[0].id, status: 'recruited', redeemedAt: redeemedAt.toISOString() });
         }
      }
      
      const user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name);
      
      if (finalCompanyName && !user.companyName) {
         const existingCompany = await db.select().from(users).where(and(eq(users.companyName, finalCompanyName), isNull(users.teamOwnerId))).limit(1);
         if (existingCompany.length > 0) {
            await db.update(users).set({ companyName: finalCompanyName, teamOwnerId: existingCompany[0].id }).where(eq(users.id, user.id));
            user.companyName = finalCompanyName;
            user.teamOwnerId = existingCompany[0].id;
         } else {
            await db.update(users).set({ companyName: finalCompanyName }).where(eq(users.id, user.id));
            user.companyName = finalCompanyName;
         }
      }
      
      res.json({ user });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

export default router;
