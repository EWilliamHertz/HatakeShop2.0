const fs = require('fs');
const lines = fs.readFileSync('src/i18n.ts', 'utf8').split('\n');
if (lines[0].includes('// @ts-nocheck')) {
  lines[0] = '// @ts-nocheck';
}
if (lines[1].includes("import i18n from 'i18next';")) {
  // It's already there? Wait, let's see
  console.log("Line 1:", lines[1]);
} else if (lines[1].includes("import { initReactI18next } from 'react-i18next';")) {
  lines.splice(1, 0, "import i18n from 'i18next';");
}
fs.writeFileSync('src/i18n.ts', lines.join('\n'));
