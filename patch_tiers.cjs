const fs = require('fs');

let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

code = code.replace(
  /const minPrice = tiers\.length > 0 \? Math\.min\(\.\.\.tiers\.map/g,
  "const minPrice = Array.isArray(tiers) && tiers.length > 0 ? Math.min(...tiers.map"
);

fs.writeFileSync('src/pages/Marketplace.tsx', code);
console.log("Patched tiers in Marketplace");
