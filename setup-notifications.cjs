const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf-8');

const notifEndpoints = `
  app.get("/api-v2/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const notifs = await db.select().from(notifications).where(eq(notifications.userId, userProfile.id)).orderBy(desc(notifications.createdAt)).limit(50);
      res.json(notifs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api-v2/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, parseInt(req.params.id, 10)), eq(notifications.userId, userProfile.id)));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api-v2/notifications/read-all", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userProfile.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!serverTs.includes('/api-v2/notifications')) {
  serverTs = serverTs.replace('app.get("/api-v2/categories"', notifEndpoints + '\n  app.get("/api-v2/categories"');
  if (!serverTs.includes('notifications')) {
    serverTs = serverTs.replace('import { products', 'import { products, notifications');
  }
  fs.writeFileSync('server.ts', serverTs);
}
