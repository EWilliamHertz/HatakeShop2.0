const fs = require('fs');
let content = fs.readFileSync('src/components/ProductModal.tsx', 'utf-8');

const oldMoq = `<span className="text-slate-200 font-medium">{product.moq} {t('units')}</span>`;
const newMoq = `<span className="text-slate-200 font-medium">{product.moq} {t('units')} (Generic) {product.oemMoq ? \`| \${product.oemMoq} units (OEM)\` : ''}</span>`;

content = content.replace(oldMoq, newMoq);
fs.writeFileSync('src/components/ProductModal.tsx', content);
