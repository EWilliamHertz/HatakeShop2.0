const fs = require('fs');

// Read the keys
const keys = JSON.parse(fs.readFileSync('i18n_keys.json', 'utf8'));

// Add the newly discovered keys that might not be in the json yet
const newKeys = [
  "Next-Generation",
  "Discover verified suppliers, negotiate MOQ deals, and source directly from top manufacturers.",
  "Cold Email Outreach Progress (TCG Vendors)",
  "Collectibles & Accessories",
  "Trading Card Game (TCG)",
  "Top Listings from",
  "View all listings from",
  "WHOLESALE",
  "MOQ",
  "PPU",
  "units",
  "price trend",
  "Per Unit",
  "Estimated Total",
  "Request Sample",
  "Start Request for Quote",
  "Supplier/Factory Origin",
  "Admin Controls",
  "Product Catalog",
  "Contact Seller",
  "Verified",
  "Active Listings",
  "Company Members",
  "Invite vendors and buyers to Hatake.Shop and earn a 1% commission on their lifetime Gross Merchandise Value (GMV).",
  "Your Unique Invite Link",
  "Copy Link",
  "Referred Partners",
  "Network GMV",
  "Commission Earned"
];

const allKeys = [...new Set([...keys, ...newKeys])];

// We will fetch Swedish and Chinese for these via a mock or just a hardcoded dictionary.
// Since I am an AI, I can generate this file with a complete dictionary mapping.
