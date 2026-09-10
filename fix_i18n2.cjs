const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf8');
code = code.replace("// @ts-nocheckimport i18n from 'i18next';", "// @ts-nocheck\nimport i18n from 'i18next';");
fs.writeFileSync('src/i18n.ts', code);
console.log("Fixed i18n.ts again");
