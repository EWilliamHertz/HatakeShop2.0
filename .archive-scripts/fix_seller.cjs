const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

const reps = [
  "Team Settings",
  "Analytics",
  "Finance & Payouts",
  "Verification Center",
  "Payments & Payouts",
  "Account Verified & Active",
  "Your account is ready to receive payouts via Stripe.",
  "Verification Pending",
  "You started onboarding, but more details are needed.",
  "Setup Stripe Connect",
  "Connect your bank account to receive funds.",
  "Connect with Stripe",
  "Payout History",
  "No payouts yet.",
  "Upgrade your trust tier to unlock more buyers and higher conversion rates. Higher tiers require manual document verification.",
  " Verified",
  "Current",
  "Basic business verification. Requires business license and identity check.",
  " Gold Supplier",
  "Premium status. Requires ISO certification and advanced business history.",
  " Audited",
  "Highest trust level. Requires on-site factory inspection reports.",
  "Document Uploads",
  "Please upload your business license, ISO certificates, or factory inspection reports here. Our administrative team will review them against your application.",
  "Drag & drop files or click to browse",
  "Total Revenue",
  "Actual revenue from completed orders",
  "Profile Views",
  "In the last 30 days",
  "Conversion Rate",
  "Inquiries to accepted orders",
  "Top Selling Value by Category",
  "Pending Review",
  "Rejected",
  "Edit Listing"
];

for (const text of reps) {
  code = code.split(`>${text}<`).join(`>{t('${text}')}<`);
}

fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
