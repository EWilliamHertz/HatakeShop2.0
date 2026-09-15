const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

const target = `onClick={() => { setSelectedCategoryId(sub.id); setSearch(""); }}`;
const replacement = `onClick={() => { setSelectedCategoryId(sub.id); setSearch(""); setPage(1); }}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/Marketplace.tsx', code);
console.log("Success");
