const fs = require('fs');

let code = fs.readFileSync('src/routes/products.ts', 'utf-8');

// Inject imports
if (!code.includes('getTranslatedProduct')) {
  code = code.replace('import { getUserProfile } from "../db/users.js";', 'import { getUserProfile } from "../db/users.js";\nimport { getTranslatedProduct } from "../lib/translate.js";');
}

// In /api-v2/products, we need to apply getTranslatedProduct. 
// Right before res.json({ products: productsData }), we map it.
// However, req.user might not exist (public route). So we get userProfile if available.
const applyTranslations = `
      let targetLanguage = 'en';
      if (req.user) {
        const userProfile = await getUserProfile(req.user.uid);
        if (userProfile && userProfile.preferredLanguage) {
          targetLanguage = userProfile.preferredLanguage;
        }
      }
      
      const translatedProducts = await Promise.all(productsData.map(p => getTranslatedProduct(p, targetLanguage)));
      res.json({ products: translatedProducts });
`;

code = code.replace(/res\.json\(\{\s*products:\s*productsData\s*\}\);/, applyTranslations);
fs.writeFileSync('src/routes/products.ts', code);
