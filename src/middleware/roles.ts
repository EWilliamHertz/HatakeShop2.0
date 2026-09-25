import { AuthRequest } from "./auth.js";
import express from "express";
import { db } from "../db/index.js";
import { users, adminAuditLog } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { getUserProfile } from "../db/users.js";

export const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    let userProfile = await getUserProfile(req.user.uid);
    if (!userProfile && req.user.email) {
      const byEmail = await db.select().from(users).where(eq(users.email, req.user.email));
      if (byEmail.length > 0) userProfile = byEmail[0];
    }
    // DB role is the single source of truth for admin access
    if (userProfile?.role === 'admin') {
      // Audit trail: every admin API hit is recorded (fire-and-forget).
      db.insert(adminAuditLog).values({
        uid: req.user.uid,
        email: req.user.email || '',
        method: req.method,
        route: req.originalUrl.split('?')[0].slice(0, 200),
        statusCode: res.statusCode,
      }).catch(() => { /* never block the request on logging */ });
      return next();
    }
    return res.status(403).send("Forbidden: Admins only");
  } catch (e) {
    res.status(500).send("Error checking admin status");
  }
};

export const requireSeller = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const userProfile = await getUserProfile(req.user.uid);
    if (userProfile?.role !== 'seller' && userProfile?.role !== 'both' && userProfile?.role !== 'admin') {
      return res.status(403).send("Forbidden: Sellers only");
    }
    next();
  } catch (e) {
    res.status(500).send("Error checking seller status");
  }
};
