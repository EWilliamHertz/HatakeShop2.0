import fs from 'fs';
let content = fs.readFileSync('src/routes/admin.ts', 'utf8');

content = content.replace(
  /const \{ isSverigeB2c \} = req\.body;\s*await db\.update\(products\)\.set\(\{ isSverigeB2c \}\)\.where\(eq\(products\.id, productId\)\);/,
  `const { isSverigeB2c, sverigeTitle, sverigePrice, sverigeImages } = req.body;
    const updates: any = {};
    if (isSverigeB2c !== undefined) updates.isSverigeB2c = isSverigeB2c;
    if (sverigeTitle !== undefined) updates.sverigeTitle = sverigeTitle;
    if (sverigePrice !== undefined) updates.sverigePrice = sverigePrice;
    if (sverigeImages !== undefined) updates.sverigeImages = sverigeImages;
    
    if (Object.keys(updates).length > 0) {
      await db.update(products).set(updates).where(eq(products.id, productId));
    }`
);

fs.writeFileSync('src/routes/admin.ts', content);
