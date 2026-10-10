import fs from 'fs';
let content = fs.readFileSync('src/routes/admin.ts', 'utf8');
const newEndpoint = `
router.patch("/api-v2/admin/products/:id/sverige", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    if (!userProfile || userProfile.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const productId = parseInt(req.params.id);
    const { isSverigeB2c } = req.body;
    
    await db.update(products).set({ isSverigeB2c }).where(eq(products.id, productId));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!content.includes('/api-v2/admin/products/:id/sverige')) {
  // Inject right before module.exports or export default router
  content = content.replace(/export default router;/g, newEndpoint + '\nexport default router;');
  fs.writeFileSync('src/routes/admin.ts', content);
}
