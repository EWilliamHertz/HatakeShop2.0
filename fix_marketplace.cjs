const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

const reps = [
  "No products listed in this category yet.",
  "Graded",
  "Wholesale",
  "Negotiable",
  "View all listings",
  "Category",
  "Sort By",
  "Newest First",
  "Randomized Sellers",
  "Lowest MOQ",
  "Lowest Price",
  "Highest Price",
  "Origin",
  "Direct Factory",
  "EU Warehouse",
  "Global Distributor",
  "Max MOQ",
  "Under 10",
  "Under 100",
  "Under 1000",
  "Loading catalog...",
  "No products found.",
  "Pricing",
  "Description",
  "Sourcing Details",
  "Primary Origin",
  "Lead Time",
  "Certifications",
  "90-Day Wholesale Price Trend",
  "Logistics Options",
  "per unit",
  "Wholesale Pricing"
];

for (const text of reps) {
  code = code.split(`>${text}<`).join(`>{t('${text}')}<`);
}

fs.writeFileSync('src/pages/Marketplace.tsx', code);
