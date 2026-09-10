const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

// Replace key texts with t('...')
code = code.replace(/>All Active RFQs</g, ">{t('All Active RFQs')}<");
code = code.replace(/>Business Contacts</g, ">{t('Business Contacts')}<");
code = code.replace(/>RFQ \& Negotiations Hub</g, ">{t('RFQ & Negotiations Hub')}<");
code = code.replace(/>Your Contacts</g, ">{t('Your Contacts')}<");
code = code.replace(/>No contacts yet\.</g, ">{t('No contacts yet.')}<");
code = code.replace(/>Start an RFQ to connect with suppliers\.</g, ">{t('Start an RFQ to connect with suppliers.')}<");

fs.writeFileSync('src/pages/RFQHub.tsx', code);
