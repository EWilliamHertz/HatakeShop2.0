const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

code = code.replace(/>AI Sourcing</g, ">{t('AI Sourcing')}<");
code = code.replace(/>Marketplace Home</g, ">{t('Marketplace Home')}<");
code = code.replace(/>Market Insights</g, ">{t('Market Insights')}<");
code = code.replace(/>Insights</g, ">{t('Insights')}<");

fs.writeFileSync('src/components/Layout.tsx', code);
