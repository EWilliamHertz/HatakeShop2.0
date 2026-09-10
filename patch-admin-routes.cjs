const fs = require('fs');
let adminTs = fs.readFileSync('src/routes/admin.ts', 'utf-8');

const approvalsEndpoint = `
router.get("/api-v2/admin/approvals", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const pendingProducts = await db.select().from(products).where(eq(products.approvalStatus, 'pending'));
    const pendingSellers = await db.select().from(users).where(eq(users.verificationStatus, 'pending')).where(eq(users.role, 'seller'));
    // For pendingUsers name changes, you might need a different table or logic, but we will pass empty array for now
    res.json({ pendingProducts, pendingSellers, pendingUsers: [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api-v2/admin/approvals/sellers/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const sellerId = parseInt(req.params.id, 10);
    const { action } = req.body;
    
    if (action === 'approve') {
      await db.update(users).set({ verificationStatus: 'verified' }).where(eq(users.id, sellerId));
    } else if (action === 'reject') {
      await db.update(users).set({ verificationStatus: 'rejected', role: 'buyer' }).where(eq(users.id, sellerId));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api-v2/admin/approvals/products/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { action } = req.body;
    
    if (action === 'approve') {
      await db.update(products).set({ approvalStatus: 'approved' }).where(eq(products.id, productId));
    } else if (action === 'reject') {
      await db.update(products).set({ approvalStatus: 'rejected' }).where(eq(products.id, productId));
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
`;

adminTs = adminTs.replace("export default router;", approvalsEndpoint + "\nexport default router;");
fs.writeFileSync('src/routes/admin.ts', adminTs);
