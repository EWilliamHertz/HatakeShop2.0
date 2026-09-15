const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

// Patch POST route
const oldPost = `const { title, description, originType, moq, tieredPricing, leadTimeDays, shippingOptions, certifications, images, stockQuantity, unitCost, categoryId, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;`;
const newPost = `const { title, description, originType, moq, offersOem, oemMoq, tieredPricing, leadTimeDays, shippingOptions, certifications, images, stockQuantity, unitCost, categoryId, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;`;

const oldPostValues = `moq: isNaN(parsedMoq) ? 1 : parsedMoq,
      tieredPricing: tieredPricing || null,`;
const newPostValues = `moq: isNaN(parsedMoq) ? 1 : parsedMoq,
      offersOem: !!offersOem,
      oemMoq: parseInt(oemMoq) || null,
      tieredPricing: tieredPricing || null,`;

content = content.replace(oldPost, newPost).replace(oldPostValues, newPostValues);

// Patch PATCH route
const oldPatch = `const { title, description, moq, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;
    const embedding = await generateEmbedding(\`\${title} \${description} \${originType}\`);
    await db.update(products).set({
      embedding,
      title, description, moq, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant,
    })`;

const newPatch = `const { title, description, moq, offersOem, oemMoq, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;
    const embedding = await generateEmbedding(\`\${title} \${description} \${originType}\`);
    await db.update(products).set({
      embedding,
      title, description, moq, offersOem: !!offersOem, oemMoq: parseInt(oemMoq) || null, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant,
    })`;

content = content.replace(oldPatch, newPatch);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts successfully");
