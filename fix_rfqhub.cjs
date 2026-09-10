const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

code = code.replace(/>Messages \& RFQs</g, ">{t('Messages & RFQs')}<");
code = code.replace(/>Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones\.</g, ">{t('Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones.')}<");
code = code.replace(/>Active RFQs</g, ">{t('Active RFQs')}<");
code = code.replace(/>Messaging</g, ">{t('Messaging')}<");
code = code.replace(/>Business Contacts</g, ">{t('Business Contacts')}<");
code = code.replace(/>All Active RFQs</g, ">{t('All Active RFQs')}<");
code = code.replace(/>Drafts</g, ">{t('Drafts')}<");
code = code.replace(/>Under Negotiation</g, ">{t('Under Negotiation')}<");
code = code.replace(/>Closed</g, ">{t('Closed')}<");
code = code.replace(/>Loading RFQs\.\.\.</g, ">{t('Loading RFQs...')}<");
code = code.replace(/>No RFQs found\.</g, ">{t('No RFQs found.')}<");
code = code.replace(/>Try AI Sourcing</g, ">{t('Try AI Sourcing')}<");
code = code.replace(/>General Inquiry</g, ">{t('General Inquiry')}<");
code = code.replace(/>Customer: /g, ">{t('Customer')}: ");
code = code.replace(/>Vendor: /g, ">{t('Vendor')}: ");
code = code.replace(/>Target Qty</g, ">{t('Target Qty')}<");
code = code.replace(/\{inq\.inquiry\.targetQuantity\}\s*units/g, "{inq.inquiry.targetQuantity} {t('units')}");
code = code.replace(/>Budget</g, ">{t('Budget')}<");
code = code.replace(/>USD Negotiable</g, ">{t('USD Negotiable')}<");
code = code.replace(/>PENDING</g, ">{t('PENDING')}<");
code = code.replace(/>Unified Inbox</g, ">{t('Unified Inbox')}<");

fs.writeFileSync('src/pages/RFQHub.tsx', code);
