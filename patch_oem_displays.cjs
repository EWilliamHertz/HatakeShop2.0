const fs = require('fs');

// Patch ProductModal.tsx
let modalContent = fs.readFileSync('src/components/ProductModal.tsx', 'utf-8');
modalContent = modalContent.replace(
  /{product\.moq} {t\('units'\)} \(Generic\) {product\.oemMoq \? \`\| \\$\{product\.oemMoq\} units \(OEM\)\` : ''}/g,
  `{product.moq} {t('units')}{product.offersOem ? \\\` (Generic) | \\\${product.oemMoq} units (OEM)\\\` : ''}`
);
fs.writeFileSync('src/components/ProductModal.tsx', modalContent);

// Patch Home.tsx
let homeContent = fs.readFileSync('src/pages/Home.tsx', 'utf-8');
homeContent = homeContent.replace(
  /{t\('MOQ'\)}: {product\.moq} Gen \/ {product\.oemMoq \|\| product\.moq} OEM/g,
  `{t('MOQ')}: {product.moq}{product.offersOem ? \\\` Gen / \\\${product.oemMoq || product.moq} OEM\\\` : ''}`
);
homeContent = homeContent.replace(
  /{t\('MOQ'\)}: {p\.product\.moq} Gen \/ {p\.product\.oemMoq \|\| p\.product\.moq} OEM/g,
  `{t('MOQ')}: {p.product.moq}{p.product.offersOem ? \\\` Gen / \\\${p.product.oemMoq || p.product.moq} OEM\\\` : ''}`
);
fs.writeFileSync('src/pages/Home.tsx', homeContent);

console.log("Patched displays");
