const fs = require('fs');
let content = fs.readFileSync('src/routes/admin.ts', 'utf-8');

// Add oemMoq to stats query
content = content.replace('moq: products.moq,', 'moq: products.moq,\n          oemMoq: products.oemMoq,');

// Add oemMoq to patch route
content = content.replace(
  'const { title, description, moq, originType, sellerId, shippingOptions, images, approvalStatus, categoryId, certifications, isSponsored } = req.body;',
  'const { title, description, moq, oemMoq, originType, sellerId, shippingOptions, images, approvalStatus, categoryId, certifications, isSponsored } = req.body;'
);

content = content.replace(
  'if(moq) updateData.moq = moq;',
  'if(moq) updateData.moq = moq; if(oemMoq !== undefined) updateData.oemMoq = oemMoq;'
);

fs.writeFileSync('src/routes/admin.ts', content);
