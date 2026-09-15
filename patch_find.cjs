const fs = require('fs');

let code = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

code = code.replace(
  /categoriesData\.find/g,
  "(Array.isArray(categoriesData) ? categoriesData : []).find"
);

fs.writeFileSync('src/components/AdminListings.tsx', code);
console.log("Patched AdminListings find calls");
