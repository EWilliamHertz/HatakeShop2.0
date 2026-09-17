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


import { adminAuth } from '../lib/firebase-admin.js';

router.post("/api-v2/auth/send-verification", requireAuth, async (req: AuthRequest, res) => {
    try {
        if (!req.user || !req.user.email) return res.status(400).json({ error: "No email associated with account." });
        
        // Generate link using Admin SDK
        const actionCodeSettings = {
           url: (process.env.APP_URL || 'https://hatake.shop') + '/feed' // Redirect here after verification
        };
        const link = await adminAuth.generateEmailVerificationLink(req.user.email, actionCodeSettings);

        // Send customized email via Resend
        const appName = "Hatake B2B";
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #020617; color: #ffffff; border-radius: 12px; border: 1px solid #1e293b;">
           <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; tracking: -1px;">${appName}</h1>
              <div style="height: 2px; width: 60px; background-color: #38bdf8; margin: 15px auto;"></div>
           </div>
           
           <h2 style="color: #f8fafc; font-size: 20px; margin-bottom: 20px;">Verify your email address</h2>
           
           <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
              Welcome to ${appName}! To complete your registration and unlock full access to our B2B network, please verify your email address by clicking the button below.
           </p>
           
           <div style="text-align: center; margin-bottom: 35px;">
              <a href="${link}" style="display: inline-block; background-color: #38bdf8; color: #020617; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 28px; border-radius: 8px;">
                 Verify Email
              </a>
           </div>
           
           <p style="color: #64748b; font-size: 13px; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px;">
              If you didn't create an account, you can safely ignore this email.<br/>
              &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
           </p>
        </div>
        `;

        await resend.emails.send({
            from: "Hatake B2B <noreply@hatake.shop>",
            to: req.user.email,
            subject: `Verify your email for ${appName}`,
            html: emailHtml
        });

        res.json({ success: true });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
