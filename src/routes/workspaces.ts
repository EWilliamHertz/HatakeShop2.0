import { Router } from "express";
import { db } from "../db/index.js";
import { companyMembers, companies, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/workspaces", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;

    // Look up the DB user by Firebase UID
    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    if (!dbUser) return res.status(404).json({ companies: [] });

    // Fetch all companies the user is a member of
    const userCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      logoUrl: companies.logoUrl,
      role: companyMembers.role
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, dbUser.id));

    res.json({ companies: userCompanies });
  } catch (err) {
    console.error("Failed to fetch workspaces", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/active", requireAuth, async (req: any, res) => {
  try {
    const { activeCompanyId } = req.body;
    const uid = req.user.uid;

    // Look up the DB user by Firebase UID
    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    // Verify membership
    if (activeCompanyId) {
      const [membership] = await db.select().from(companyMembers)
        .where(and(eq(companyMembers.companyId, activeCompanyId), eq(companyMembers.userId, dbUser.id)));
      
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }
    }

    await db.update(users)
      .set({ activeCompanyId: activeCompanyId || null })
      .where(eq(users.id, dbUser.id));

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update active workspace", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /workspaces/:companyId
 * Update the company profile. Requires the caller to be a member (owner or admin).
 */
router.patch("/workspaces/:companyId", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId)) return res.status(400).json({ error: "Invalid companyId" });

    // Resolve internal user id
    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    // Verify membership
    const [membership] = await db.select().from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, dbUser.id)));
    
    if (!membership) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    // Only owners and admins may update the company profile
    if (membership.role !== "owner" && membership.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions. Only owners and admins can update the workspace profile." });
    }

    const allowedFields: (keyof typeof companies.$inferInsert)[] = [
      "name", "logoUrl", "bannerUrl", "vatNumber", "country", "region", "website", "aboutUs"
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }

    const [updatedCompany] = await db.update(companies)
      .set(updates)
      .where(eq(companies.id, companyId))
      .returning();

    res.json(updatedCompany);
  } catch (err) {
    console.error("Failed to update workspace", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /workspaces/:companyId/members
 * Returns all members of the company, joined with user info.
 * Requires caller to be a member of the company.
 */
router.get("/workspaces/:companyId/members", requireAuth, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId)) return res.status(400).json({ error: "Invalid companyId" });

    // Resolve internal user id
    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    // Verify membership
    const [membership] = await db.select().from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, dbUser.id)));
    
    if (!membership) {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    // Fetch all members, joining with users table
    const members = await db.select({
      memberId: companyMembers.id,
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      role: companyMembers.role,
      joinedAt: companyMembers.createdAt,
      inviteCode: users.inviteCode,
    })
    .from(companyMembers)
    .innerJoin(users, eq(companyMembers.userId, users.id))
    .where(eq(companyMembers.companyId, companyId));

    // The invite code of the workspace owner (for the invite link)
    const ownerMember = members.find(m => m.role === "owner");
    const inviteCode = ownerMember?.inviteCode ?? null;

    res.json({
      members: members.map(m => ({
        memberId: m.memberId,
        userId: m.userId,
        displayName: m.displayName,
        email: m.email,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      inviteCode,
      myRole: membership.role,
    });
  } catch (err) {
    console.error("Failed to fetch workspace members", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
