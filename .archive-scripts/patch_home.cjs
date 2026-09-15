const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf-8');

content = content.replace('{t(\'MOQ\')}: {product.moq}', '{t(\'MOQ\')}: {product.moq} Gen / {product.oemMoq || product.moq} OEM');
content = content.replace('{t(\'MOQ\')}: {p.product.moq}', '{t(\'MOQ\')}: {p.product.moq} Gen / {p.product.oemMoq || p.product.moq} OEM');

fs.writeFileSync('src/pages/Home.tsx', content);
