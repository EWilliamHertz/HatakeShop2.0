const fs = require('fs');
let code = fs.readFileSync('src/components/ProductModal.tsx', 'utf-8');
code = code.replace('{formatPrice(product.unitCost || product.moqPrice || 0)}', "{formatPrice(product.unitPrice || 0)}");
fs.writeFileSync('src/components/ProductModal.tsx', code);
