const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

code = code.replace(/\{t\('units'\)\}/g, " {t('units')}");

fs.writeFileSync('src/pages/RFQHub.tsx', code);
