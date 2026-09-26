const fs = require('fs');
let code = fs.readFileSync('src/routes/products.ts', 'utf8');

const newEndpoint = `
router.get("/api-v2/products/:id", async (req, res) => {
  try {
    const pId = parseInt(req.params.id, 10);
    const data = await db.select({ product: products, seller: { companyName: users.companyName, id: users.id } })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, pId));
      
    if (!data.length) return res.status(404).json({ error: "Product not found" });
    res.json({ ...data[0].product, seller: data[0].seller });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
`;

// Insert the new endpoint before the reviews endpoints
code = code.replace(
  "router.get('/api-v2/products/:id/reviews'",
  newEndpoint + "\nrouter.get('/api-v2/products/:id/reviews'"
);

fs.writeFileSync('src/routes/products.ts', code);
