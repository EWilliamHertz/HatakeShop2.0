const fs = require('fs');
const content = fs.readFileSync('src/pages/Storefront.tsx', 'utf8');
let openDivs = (content.match(/<div/g) || []).length;
let closeDivs = (content.match(/<\/div>/g) || []).length;
console.log(`Open divs: ${openDivs}, Close divs: ${closeDivs}`);
