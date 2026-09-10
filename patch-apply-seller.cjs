const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf-8');

const applySellerEndpoint = `
  app.post("/api-v2/users/apply-seller", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      if (userProfile.role === 'seller' || userProfile.role === 'both') {
        return res.status(400).json({ error: "Already a seller" });
      }
      
      // We change role to seller, but verificationStatus becomes 'pending'
      await db.update(users).set({ 
        role: userProfile.role === 'buyer' ? 'seller' : 'both',
        verificationStatus: 'pending'
      }).where(eq(users.id, userProfile.id));
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!serverTs.includes('/api-v2/users/apply-seller')) {
  serverTs = serverTs.replace('app.put("/api-v2/users/me"', applySellerEndpoint + '\n  app.put("/api-v2/users/me"');
  fs.writeFileSync('server.ts', serverTs);
}
