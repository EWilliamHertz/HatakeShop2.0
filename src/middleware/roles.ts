import { AuthRequest, extractAdminPasswordTokenFromReq, verifyAdminPasswordToken } from "./auth.js";
import express from "express";
import { db } from "../db/index.js";
import { users, adminAuditLog } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { getUserProfile } from "../db/users.js";

/**
 * STRICT ADMIN PASSWORD REQUIREMENT:
 * Every admin route (/api-v2/admin/*) MUST be authenticated with a valid
 * cryptographic token signed by ADMIN_PASSWORD (from .env / Vercel env).
 * Simply having role === 'admin' in the database is NEVER enough to bypass
 * the ADMIN_PASSWORD lock.
 */
export const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  try {
    const adminTokenCandidate = extractAdminPasswordTokenFromReq(req);
    const verifiedAdmin = adminTokenCandidate ? verifyAdminPasswordToken(adminTokenCandidate) : null;

    if (req.user?.isAdminPasswordAuth || verifiedAdmin) {
      const uid = verifiedAdmin?.uid || req.user?.uid || 'hatake_env_admin';
      const email = verifiedAdmin?.email || req.user?.email || 'ernst@hatake.eu';
      db.insert(adminAuditLog).values({
        uid,
        email,
        method: req.method,
        route: req.originalUrl.split('?')[0].slice(0, 200),
        statusCode: res.statusCode,
      }).catch(() => {});
      return next();
    }

    return res.status(403).json({
      error: "Forbidden: ADMIN_PASSWORD authentication is required to access Admin endpoints.",
      requiresAdminPassword: true,
    });
  } catch (e) {
    res.status(500).json({ error: "Error verifying admin password token" });
  }
};

export const requireSeller = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    if (req.user.isAdminPasswordAuth) return next();
    const adminTokenCandidate = extractAdminPasswordTokenFromReq(req);
    if (adminTokenCandidate && verifyAdminPasswordToken(adminTokenCandidate)) return next();

    const userProfile = await getUserProfile(req.user.uid);
    if (userProfile?.role !== 'seller' && userProfile?.role !== 'both' && userProfile?.role !== 'admin') {
      return res.status(403).send("Forbidden: Sellers only");
    }
    next();
  } catch (e) {
    res.status(500).send("Error checking seller status");
  }
};
