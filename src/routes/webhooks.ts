import express from "express";
import { getStripe, getEasyPost, resend, generateEmbedding, ai } from "../lib/services.js";

import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, feedback, leads, affiliates, marketing_logs, categories, inquiries, inquiryMessages, reviews, orders } from "../db/schema.js";
import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin, requireSeller } from "../middleware/roles.js";
import crypto from "crypto";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
import { getUserProfile } from "../db/users.js";

const router = Router();

router.post("/api-v2/stripe/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(400).send("Stripe not configured");
    
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const inquiryId = session.metadata?.inquiryId;
      if (inquiryId) {
         await db.update(inquiries).set({ 
           paymentStatus: 'Escrow Funded',
           stripePaymentIntentId: session.payment_intent as string
         }).where(eq(inquiries.id, parseInt(inquiryId, 10)));
         
         const inq = await db.select().from(inquiries).where(eq(inquiries.id, parseInt(inquiryId, 10)));
         if (inq.length > 0) {
            const io = (req as any).io;
            if (io) {
               io.to(`inquiry_${inquiryId}`).emit("inquiry_updated", { paymentStatus: 'Escrow Funded' });
            }
         }
      }

      const orderId = session.metadata?.orderId;
      if (orderId) {
         await db.update(orders).set({
           status: 'paid',
           stripePaymentIntentId: session.payment_intent as string
         }).where(eq(orders.id, parseInt(orderId, 10)));
      }
    }
    res.json({received: true});
  });

router.post("/api-v2/webhooks/resend", async (req, res) => {
    try {
      let body = req.body;
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        try {
          body = JSON.parse(body.toString());
        } catch (parseErr) {
          console.error("[Resend Webhook] Invalid JSON payload:", parseErr);
          return res.status(400).json({ error: "Invalid JSON payload" });
        }
      }

      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: "Empty or invalid payload" });
      }

      const eventType = body.type;
      const eventData = body.data || body;
      const eventCreatedAt = body.created_at || eventData.created_at || new Date().toISOString();
      const parsedDate = new Date(eventCreatedAt);
      const eventDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

      // 3-Tier Lead Matching
      // Tier 1: tags.lead_id
      let tagLeadId: string | null = null;
      if (eventData.tags) {
        if (Array.isArray(eventData.tags)) {
          const found = eventData.tags.find((t: any) => t && (t.name === 'lead_id' || t.key === 'lead_id'));
          if (found && found.value !== undefined) tagLeadId = String(found.value);
        } else if (typeof eventData.tags === 'object') {
          if (eventData.tags.lead_id !== undefined) tagLeadId = String(eventData.tags.lead_id);
          else if (eventData.tags.leadId !== undefined) tagLeadId = String(eventData.tags.leadId);
        }
      }
      if (!tagLeadId) {
        if (eventData.lead_id !== undefined) tagLeadId = String(eventData.lead_id);
        else if (eventData.leadId !== undefined) tagLeadId = String(eventData.leadId);
        else if (body.lead_id !== undefined) tagLeadId = String(body.lead_id);
        else if (body.leadId !== undefined) tagLeadId = String(body.leadId);
      }

      let matchedLead: any = null;
      if (tagLeadId && !isNaN(Number(tagLeadId))) {
        const byId = await db.select().from(leads).where(eq(leads.id, Number(tagLeadId)));
        if (byId.length > 0) matchedLead = byId[0];
      }

      // Tier 2: resend_email_id
      const resendEmailId = eventData.email_id || eventData.id || eventData.emailId;
      if (!matchedLead && resendEmailId) {
        const byResendId = await db.select().from(leads).where(eq(leads.resendEmailId, String(resendEmailId)));
        if (byResendId.length > 0) matchedLead = byResendId[0];
      }

      // Tier 3: email (data.to, data.recipient, etc.)
      let recipientEmail: string | null = null;
      if (Array.isArray(eventData.to) && eventData.to.length > 0) {
        recipientEmail = String(eventData.to[0]).trim();
      } else if (typeof eventData.to === 'string') {
        recipientEmail = eventData.to.trim();
      } else if (typeof eventData.email === 'string') {
        recipientEmail = eventData.email.trim();
      } else if (typeof eventData.recipient === 'string') {
        recipientEmail = eventData.recipient.trim();
      }

      if (!matchedLead && recipientEmail) {
        const byEmail = await db.select().from(leads).where(ilike(leads.email, recipientEmail));
        if (byEmail.length > 0) matchedLead = byEmail[0];
      }

      if (!matchedLead) {
        console.warn(`[Resend Webhook] Unmatched lead for event ${eventType}`, { tagLeadId, resendEmailId, recipientEmail });
        return res.status(200).json({ received: true, message: "No matching lead found" });
      }

      const resendIdVal = resendEmailId ? String(resendEmailId) : null;
      const eventDateStr = eventDate.toISOString();
      let updatedRow: any = null;

      if (eventType === 'email.delivered') {
        const updateRes = await db.execute(sql`
          UPDATE leads SET
            status = CASE 
              WHEN status = 'pending' THEN 'sent' 
              ELSE status 
            END,
            sent_at = CASE 
              WHEN status = 'pending' AND sent_at IS NULL THEN ${eventDateStr}::timestamp 
              ELSE sent_at 
            END,
            resend_email_id = COALESCE(resend_email_id, ${resendIdVal})
          WHERE id = ${matchedLead.id}
          RETURNING id, status, opened_at, clicked_at;
        `);
        updatedRow = updateRes.rows[0];
      } else if (eventType === 'email.opened') {
        // Enforce forward-only status monotonicity:
        // Update to 'opened' and set openedAt only if current status is 'pending' or 'sent' (never overwrite 'clicked' or 'recruited')
        const updateRes = await db.execute(sql`
          UPDATE leads SET
            status = CASE 
              WHEN status IN ('pending', 'sent') THEN 'opened' 
              ELSE status 
            END,
            opened_at = COALESCE(opened_at, ${eventDateStr}::timestamp),
            resend_email_id = COALESCE(resend_email_id, ${resendIdVal})
          WHERE id = ${matchedLead.id}
          RETURNING id, status, opened_at, clicked_at;
        `);
        updatedRow = updateRes.rows[0];
      } else if (eventType === 'email.clicked') {
        // Enforce forward-only status monotonicity:
        // Update to 'clicked' and set clickedAt only if current status is 'pending', 'sent', or 'opened' (never overwrite 'recruited')
        const updateRes = await db.execute(sql`
          UPDATE leads SET
            status = CASE 
              WHEN status IN ('pending', 'sent', 'opened') THEN 'clicked' 
              ELSE status 
            END,
            clicked_at = COALESCE(clicked_at, ${eventDateStr}::timestamp),
            opened_at = COALESCE(opened_at, ${eventDateStr}::timestamp),
            resend_email_id = COALESCE(resend_email_id, ${resendIdVal})
          WHERE id = ${matchedLead.id}
          RETURNING id, status, opened_at, clicked_at;
        `);
        updatedRow = updateRes.rows[0];
      } else {
        const updateRes = await db.execute(sql`
          UPDATE leads SET
            resend_email_id = COALESCE(resend_email_id, ${resendIdVal})
          WHERE id = ${matchedLead.id}
          RETURNING id, status, opened_at, clicked_at;
        `);
        updatedRow = updateRes.rows[0];
      }

      const finalStatus = updatedRow?.status || matchedLead.status || 'pending';
      const finalOpenedAt = updatedRow?.opened_at;
      const finalClickedAt = updatedRow?.clicked_at;

      const io = (req as any).io;
      if (io) {
        io.emit("lead_updated", {
          id: matchedLead.id,
          status: finalStatus,
          openedAt: finalOpenedAt ? new Date(finalOpenedAt).toISOString() : undefined,
          clickedAt: finalClickedAt ? new Date(finalClickedAt).toISOString() : undefined,
        });
      }

      return res.status(200).json({
        received: true,
        leadId: matchedLead.id,
        status: finalStatus
      });
    } catch (err: any) {
      console.error("[Resend Webhook Error]:", err);
      return res.status(500).json({ error: err.message });
    }
  });

export default router;
