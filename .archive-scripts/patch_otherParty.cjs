const fs = require('fs');
const file = 'src/pages/RFQHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const target3 = `const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");`;
const replacement3 = `const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || inq.seller?.displayName || "Vendor") : (inq.buyer?.companyName || inq.buyer?.displayName || "Customer");`;
content = content.replace(new RegExp(target3.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), replacement3);

const target4 = `{otherParty.charAt(0).toUpperCase()}`;
const replacement4 = `{(otherParty || '?').charAt(0).toUpperCase()}`;
content = content.replace(new RegExp(target4.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), replacement4);

fs.writeFileSync(file, content);
