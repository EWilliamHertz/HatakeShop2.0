const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

// The issue is inside a ternary or similar
code = code.replace(/'\{t\('Request Sample'\)\}'/g, "t('Request Sample')");
code = code.replace(/>\{t\('\{t\('([^']+)'\)\}'\)\}</g, ">{t('$1')}<");
code = code.replace(/>\{t\('Next-Generation '\)\}/g, ">{t('Next-Generation')} ");

fs.writeFileSync('src/pages/Marketplace.tsx', code);
