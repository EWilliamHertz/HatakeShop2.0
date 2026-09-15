const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

const reps = [
  ['Next-Generation ', "{t('Next-Generation')} "],
  ['Discover verified suppliers, negotiate MOQ deals, and source directly from top manufacturers.', "{t('Discover verified suppliers, negotiate MOQ deals, and source directly from top manufacturers.')}"],
  ['Cold Email Outreach Progress (TCG Vendors)', "{t('Cold Email Outreach Progress (TCG Vendors)')}"],
  ['Wholesale OEM', "{t('Wholesale OEM')}"],
  ['Tonnes & Containers', "{t('Tonnes & Containers')}"],
  ['Retail Stock', "{t('Retail Stock')}"],
  ['Low Volume Brands', "{t('Low Volume Brands')}"],
  ['Collectibles & Accessories', "{t('Collectibles & Accessories')}"],
  ['Trading Card Game (TCG)', "{t('Trading Card Game (TCG)')}"],
  ['Top Listings from ', "{t('Top Listings from')} "],
  ['View all listings from ', "{t('View all listings from')} "],
  ['WHOLESALE', "{t('WHOLESALE')}"],
  ['MOQ:', "{t('MOQ')}:"],
  ['PPU:', "{t('PPU')}:"],
  ['/ units', "/ {t('units')}"],
  ['price trend', "{t('price trend')}"],
  ['Per Unit', "{t('Per Unit')}"],
  ['Estimated Total', "{t('Estimated Total')}"],
  ['Request Sample', "{t('Request Sample')}"],
  ['Start Request for Quote', "{t('Start Request for Quote')}"],
  ['Supplier/Factory Origin', "{t('Supplier/Factory Origin')}"]
];

reps.forEach(([oldStr, newStr]) => {
  // Try exact match where text is child
  code = code.split(`>${oldStr}<`).join(`>${newStr}<`);
  // Try loose where there might be spaces or other tags around
  code = code.split(oldStr).join(newStr);
});

fs.writeFileSync('src/pages/Marketplace.tsx', code);
