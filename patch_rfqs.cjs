const fs = require('fs');
let code = fs.readFileSync('src/routes/rfqs.ts', 'utf8');

// Include notificationEmails in the query
code = code.replace(/sellerUid: users.uid, sellerEmail: users.email, productTitle: products.title/, 
  "sellerUid: users.uid, sellerEmail: users.email, productTitle: products.title, notificationEmails: users.notificationEmails");

// Get the array of emails
const extractCode = `const { sellerUid, sellerEmail, productTitle } = productInfo[0];`;
const replaceExtract = `const { sellerUid, sellerEmail, productTitle, notificationEmails } = productInfo[0];`;
code = code.replace(extractCode, replaceExtract);

// Update resend.emails.send 'to' field
const oldTo = /to: sellerEmail,/;
const newTo = `to: Array.from(new Set([sellerEmail, ...(notificationEmails || [])])).filter(Boolean).slice(0, 5),`;
code = code.replace(oldTo, newTo);

fs.writeFileSync('src/routes/rfqs.ts', code);
console.log('rfqs.ts patched');
