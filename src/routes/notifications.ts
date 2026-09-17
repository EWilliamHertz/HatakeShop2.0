import { Router } from "express";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get(["/api-v2/notifications", "/api/notifications", "/notifications"], requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.dbId; // Note: Ensure requireAuth sets dbId or fetch it
    // Wait, let's just fetch dbId based on uid if it's not present
    const { users } = await import("../db/schema.js");
    const userRow = await db.select().from(users).where(eq(users.uid, req.user.uid)).limit(1);
    if (userRow.length === 0) return res.json([]);
    
    const dbUserId = userRow[0].id;
    const notifs = await db.select().from(notifications).where(eq(notifications.userId, dbUserId)).orderBy(desc(notifications.createdAt)).limit(50);
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(["/api-v2/notifications/:id/read"], requireAuth, async (req: any, res: any) => {
  try {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(["/api-v2/notifications/read-all"], requireAuth, async (req: any, res: any) => {
  try {
    const { users } = await import("../db/schema.js");
    const userRow = await db.select().from(users).where(eq(users.uid, req.user.uid)).limit(1);
    if (userRow.length === 0) return res.json({ success: true });
    
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userRow[0].id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
