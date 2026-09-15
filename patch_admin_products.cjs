const fs = require('fs');
let code = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

code = code.replace(
  /const filteredProducts = products\.filter/g,
  "const filteredProducts = (Array.isArray(products) ? products : []).filter"
);

fs.writeFileSync('src/components/AdminListings.tsx', code);
console.log("Patched AdminListings filter");
