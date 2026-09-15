const fs = require('fs');
let content = fs.readFileSync('src/routes/products.ts', 'utf-8');

// Add oemMoq to products query
content = content.replace('moq: products.moq,', 'moq: products.moq,\n          oemMoq: products.oemMoq,');

// Also in /api-v2/seller/products (if it exists)
content = content.replace('const { title, description, categoryId, moq, unitCost,', 'const { title, description, categoryId, moq, oemMoq, unitCost,');
content = content.replace('moq: Number(moq),', 'moq: Number(moq),\n        oemMoq: Number(oemMoq || moq),');
content = content.replace('if(moq) updateData.moq = Number(moq);', 'if(moq) updateData.moq = Number(moq); if(oemMoq) updateData.oemMoq = Number(oemMoq);');

fs.writeFileSync('src/routes/products.ts', content);
