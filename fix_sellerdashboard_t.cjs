const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

if (!code.includes("useTranslation")) {
   code = code.replace(`import { useAuth } from '../components/AuthContext.tsx';`, `import { useAuth } from '../components/AuthContext.tsx';\nimport { useTranslation } from 'react-i18next';`);
   code = code.replace(`export function SellerDashboard() {`, `export function SellerDashboard() {\n  const { t } = useTranslation();`);
}

code = code.replace(/>Overview</g, `>{t('Overview')}<`);
code = code.replace(/>Listings</g, `>{t('Listings')}<`);
code = code.replace(/>Payments</g, `>{t('Payments')}<`);
code = code.replace(/>Create New Wholesale Listing</g, `>{t('Create New Wholesale Listing')}<`);
code = code.replace(/>Highest Tier Gross Sales Profit</g, `>{t('Highest Tier Gross Sales Profit')}<`);
code = code.replace(/>Lowest Tier Gross Sales Profit</g, `>{t('Lowest Tier Gross Sales Profit')}<`);
code = code.replace(/>Draft Purchase Order</g, `>{t('Draft Purchase Order')}<`);
code = code.replace(/>Critical Restock Alert</g, `>{t('Critical Restock Alert')}<`);

fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
