const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyProfile.tsx', 'utf8');

code = code.replace(/>The company profile you are looking for does not exist or has been removed\.</g, ">{t('The company profile you are looking for does not exist or has been removed.')}<");
code = code.replace(/>No Image</g, ">{t('No Image')}<");
code = code.replace(/>No products listed publicly yet\.</g, ">{t('No products listed publicly yet.')}<");
code = code.replace(/>Org\. Nummer</g, ">{t('Org. Nummer')}<");
code = code.replace(/>No public team members listed\.</g, ">{t('No public team members listed.')}<");

fs.writeFileSync('src/pages/CompanyProfile.tsx', code);
