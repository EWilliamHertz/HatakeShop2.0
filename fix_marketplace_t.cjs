const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

const replacements = [
  ['B2B TCG Sourcing', "t('B2B TCG Sourcing')"],
  ['Empowering Global B2B Trade at Any Scale', "t('Empowering Global B2B Trade at Any Scale')"],
  ['Scaling the Verified Vendor Network Daily', "t('Scaling the Verified Vendor Network Daily')"],
  ['Search products, brands, or categories...', "t('Search products, brands, or categories...')"],
  ['Search', "t('Search')"],
  ['Categories', "t('Categories')"],
  ['All Categories', "t('All Categories')"],
  ['Featured Categories', "t('Featured Categories')"],
  ['Origin Pref', "t('Origin Pref')"],
  ['Any Origin', "t('Any Origin')"],
  ['Volume Pricing', "t('Volume Pricing')"],
  ['Base MOQ', "t('Base MOQ')"],
  ['Any MOQ', "t('Any MOQ')"],
  ['Filter Results', "t('Filter Results')"],
];

for (let [oldStr, newStr] of replacements) {
    if (oldStr.includes("Search products")) {
       code = code.replace(/placeholder="Search products, brands, or categories\.\.\."/g, `placeholder={${newStr}}`);
    } else {
       // Only replace where it's a direct text child or exact match
       const regex = new RegExp(`>${oldStr}<`, 'g');
       code = code.replace(regex, `>{${newStr}}<`);
    }
}
fs.writeFileSync('src/pages/Marketplace.tsx', code);
