const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyProfile.tsx', 'utf8');

// Replace standard strings
code = code.replace(/>Company Not Found</g, ">{t('Company Not Found')}<");
code = code.replace(/>Return to Marketplace</g, ">{t('Return to Marketplace')}<");
code = code.replace(/>Company Overview</g, ">{t('Company Overview')}<");
code = code.replace(/>Business Details</g, ">{t('Business Details')}<");
code = code.replace(/>Verified Business</g, ">{t('Verified Business')}<");
code = code.replace(/>Registration Region</g, ">{t('Registration Region')}<");
code = code.replace(/>Organization Number</g, ">{t('Organization Number')}<");
code = code.replace(/>Social \& External Links</g, ">{t('Social & External Links')}<");
code = code.replace(/>Contact</g, ">{t('Contact')}<");
code = code.replace(/>Product Catalog</g, ">{t('Product Catalog')}<");
code = code.replace(/>Contact Seller</g, ">{t('Contact Seller')}<");
code = code.replace(/>Verified/g, ">{t('Verified')}<");
code = code.replace(/>Active Listings</g, ">{t('Active Listings')}<");
code = code.replace(/>Company Members</g, ">{t('Company Members')}<");

fs.writeFileSync('src/pages/CompanyProfile.tsx', code);
