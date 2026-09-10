const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(/>Access the B2B Wholesale Marketplace</g, ">{t('Access the B2B Wholesale Marketplace')}<");
code = code.replace(/>or</g, ">{t('or')}<");

fs.writeFileSync('src/pages/Login.tsx', code);
