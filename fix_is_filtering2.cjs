const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');
code = code.replace(
  /\|\| productType !== 'all'/g,
  ""
);
fs.writeFileSync('src/pages/Marketplace.tsx', code);
console.log("Fixed isFiltering productType");
