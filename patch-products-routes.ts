import fs from 'fs';
let content = fs.readFileSync('src/routes/products.ts', 'utf8');
const newEndpoint = `
router.get("/api-v2/sverige-products", async (req, res) => {
  try {
    const p = await db.select().from(products).where(eq(products.isSverigeB2c, true));
    // Also fetch seller info for these products
    const s = await db.select().from(users);
    const sellerMap = Object.fromEntries(s.map(x => [x.id, x]));
    
    res.json(p.map(prod => ({
       ...prod,
       seller: sellerMap[prod.sellerId] || {}
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!content.includes('/api-v2/sverige-products')) {
  content = content.replace(/export default router;/g, newEndpoint + '\nexport default router;');
  fs.writeFileSync('src/routes/products.ts', content);
}
