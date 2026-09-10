const fs = require('fs');
let code = fs.readFileSync('src/pages/SourcingAI.tsx', 'utf8');

const reps = [
  "Total Est. Budget",
  "Destination",
  "Origin Pref",
  "Line Items",
  "Recommended Vendor Splits",
  "pgvector"
];

for (const text of reps) {
  code = code.split(`>${text}<`).join(`>{t('${text}')}<`);
}

fs.writeFileSync('src/pages/SourcingAI.tsx', code);
