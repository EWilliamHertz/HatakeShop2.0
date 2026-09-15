const fs = require('fs');

let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

code = code.replace(
  /const isFiltering = Boolean\(search \|\| selectedCategoryId \|\| selectedOrigin \|\| minMoq \|\| maxPrice \|\| sortBy !== 'newest' \|\| productType !== 'all'\);/g,
  "const isFiltering = Boolean(search || selectedCategoryId || filters.origin || filters.minMoq || filters.maxPrice || filters.sortBy !== 'newest' || productType !== 'all');"
);

fs.writeFileSync('src/pages/Marketplace.tsx', code);
console.log("Fixed isFiltering");
