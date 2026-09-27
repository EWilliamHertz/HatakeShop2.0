import { Router } from "express";
import { db } from "../db/index.js";
import { companyMembers, companies, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/workspaces", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
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
    .where(eq(companyMembers.userId, userId));

    res.json({ companies: userCompanies });
  } catch (err) {
    console.error("Failed to fetch workspaces", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/active", requireAuth, async (req: any, res) => {
  try {
    const { activeCompanyId } = req.body;
    const userId = req.user.id;

    // Verify membership
    if (activeCompanyId) {
      const [membership] = await db.select().from(companyMembers)
        .where(and(eq(companyMembers.companyId, activeCompanyId), eq(companyMembers.userId, userId)));
      
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }
    }

    await db.update(users)
      .set({ activeCompanyId: activeCompanyId || null })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update active workspace", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
