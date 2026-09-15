const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf-8');

const singleProductEndpoint = `
  app.post("/api-v2/seller/products", requireAuth, requireSeller, async (req: AuthRequest, res) => {
    try {
      const userProfile = await getUserProfile(req.user!.uid);
      const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
      
      const { title, description, originType, moq, tieredPricing, leadTimeDays, shippingOptions, certifications, images, stockQuantity, unitCost, categoryId, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;
      const embedding = await generateEmbedding(\`\${title} \${description} \${originType || 'Direct Factory'}\`);
      
      const parsedMoq = parseInt(moq, 10);
      const parsedLeadTime = parseInt(leadTimeDays, 10);
      const parsedStock = parseInt(stockQuantity, 10);
      const parsedCost = parseFloat(unitCost);
      const parsedYear = parseInt(cardYear, 10);

      const [newProduct] = await db.insert(products).values({
        embedding,
        sellerId: teamOwnerId,
        title,
        description,
        moq: isNaN(parsedMoq) ? 1 : parsedMoq,
        tieredPricing: tieredPricing || null,
        originType: originType || 'Direct Factory',
        leadTimeDays: isNaN(parsedLeadTime) ? 7 : parsedLeadTime,
        shippingOptions: shippingOptions || [],
        certifications: certifications || [],
        images: images || [],
        stockQuantity: isNaN(parsedStock) ? 0 : parsedStock,
        unitCost: isNaN(parsedCost) ? 0 : parsedCost,
        categoryId: categoryId || null,
        productType: productType || 'sealed',
        gradingCompany: gradingCompany || null,
        grade: grade || null,
        certNumber: certNumber || null,
        cardYear: isNaN(parsedYear) ? null : parsedYear,
        cardSet: cardSet || null,
        cardNumber: cardNumber || null,
        cardVariant: cardVariant || null,
      }).returning();
      
      res.json(newProduct);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
`;

if (!serverTs.includes('app.post("/api-v2/seller/products"')) {
  serverTs = serverTs.replace('app.post("/api-v2/seller/products/bulk"', singleProductEndpoint + '\n  app.post("/api-v2/seller/products/bulk"');
  fs.writeFileSync('server.ts', serverTs);
}
