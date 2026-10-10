import fs from 'fs';
let content = fs.readFileSync('src/pages/SwedenShop.tsx', 'utf8');

content = content.replace(
  /\{selectedProduct && <ProductModal product=\{selectedProduct\} onClose=\{\(\) => setSelectedProduct\(null\)\} \/>\}/,
  `{selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} hideMOQ={true} />}`
);

fs.writeFileSync('src/pages/SwedenShop.tsx', content);
