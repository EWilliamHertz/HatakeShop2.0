const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const replacements = [
  "United States",
  "United Kingdom",
  "European Union",
  "Japan",
  "China",
  "Other",
  "Seller / Manufacturer",
  "Verified",
  "PDF, JPG, PNG up to 10MB",
  "English",
  "Spanish (Español)",
  "Mandarin (中文)",
  "French (Français)",
  "German (Deutsch)",
  "Japanese (日本語)",
  "Swedish (Svenska)"
];

for (const text of replacements) {
  code = code.split(`>${text}<`).join(`>{t('${text}')}<`);
  code = code.split(`"${text}"`).join(`"${text}"`); // keep values as is
}

fs.writeFileSync('src/pages/Settings.tsx', code);
