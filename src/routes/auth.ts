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
        const appUrl = process.env.APP_URL || 'https://hatake.shop';
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background-color:#0a0f1e;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0f1e;padding:40px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#020617;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">
              
              <!-- Header with gradient bar -->
              <tr><td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);height:4px;font-size:0;">&nbsp;</td></tr>
              
              <!-- Logo area -->
              <tr><td align="center" style="padding:36px 40px 20px 40px;">
                <img src="${appUrl}/logo.png" alt="Hatake" width="90" height="90" style="display:block;border-radius:50%;border:3px solid #1e293b;background:#ffffff;" />
                <div style="margin-top:14px;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Hatake B2B</div>
                <div style="margin-top:4px;font-family:Arial,sans-serif;font-size:12px;color:#38bdf8;letter-spacing:3px;text-transform:uppercase;">Enterprise TCG Network</div>
              </td></tr>

              <!-- Divider -->
              <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#1e293b;"></div></td></tr>

              <!-- Body -->
              <tr><td style="padding:36px 40px;">
                <h2 style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#f8fafc;">Verify your email address</h2>
                <p style="margin:0 0 28px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#94a3b8;">
                  Welcome to Hatake B2B! To complete your registration and unlock full access to our international B2B network — including the marketplace, RFQ hub, and company feed — please verify your email address below.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 32px 0;">
                  <a href="${link}" style="display:inline-block;background-color:#38bdf8;color:#020617;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:16px;padding:16px 40px;border-radius:10px;letter-spacing:0.3px;">
                    ✓ &nbsp; Verify My Email
                  </a>
                </td></tr></table>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#475569;line-height:1.6;">
                  This link will expire in <strong style="color:#94a3b8;">24 hours</strong>. If you didn't create a Hatake B2B account, you can safely ignore this email.
                </p>
              </td></tr>

              <!-- Footer -->
              <tr><td style="padding:0 40px 36px 40px;">
                <div style="height:1px;background-color:#1e293b;margin-bottom:24px;"></div>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#334155;text-align:center;line-height:1.8;">
                  &copy; ${new Date().getFullYear()} Hatake B2B &mdash; International TCG Enterprise Network<br/>
                  <a href="${appUrl}" style="color:#38bdf8;text-decoration:none;">hatake.shop</a>
                  &nbsp;&middot;&nbsp;
                  <a href="mailto:b2b@hatake.shop" style="color:#38bdf8;text-decoration:none;">b2b@hatake.shop</a>
                </p>
              </td></tr>

            </table>
          </td></tr>
        </table>
        </body>
        </html>
        `;

        const resendResponse = await resend.emails.send({
            from: "Hatake B2B <noreply@hatake.shop>",
            to: req.user.email,
            subject: `Verify your email for ${appName}`,
            html: emailHtml
        });
        
        if (resendResponse.error) {
           throw new Error("Resend API Error: " + resendResponse.error.message);
        }

        res.json({ success: true, id: resendResponse.data?.id });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
