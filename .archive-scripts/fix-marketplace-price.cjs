const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf-8');
code = code.replace('{formatPrice(p.unitCost || p.moqPrice || 0)}', "{formatPrice(p.tieredPricing?.length > 0 ? Math.min(...p.tieredPricing.map((t: any) => parseFloat(t.price || t.unitPrice || '0'))) : (p.unitPrice || 0))}");
fs.writeFileSync('src/pages/Marketplace.tsx', code);
