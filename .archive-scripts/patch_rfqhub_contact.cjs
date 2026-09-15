const fs = require('fs');
const file = 'src/pages/RFQHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `<h3 className="font-bold text-slate-900">{contact.companyName || contact.displayName}</h3>`;
const replacement1 = `<h3 className="font-bold text-slate-900">{contact.companyName ? \`\${contact.companyName} (\${contact.displayName || 'User'})\` : (contact.displayName || 'User')}</h3>`;
content = content.replace(target1, replacement1);

const target2 = `<p className="text-sm text-slate-600 mt-1">Vendor: {inq.seller?.companyName || "Multiple matching vendors"}</p>
                          <p className="text-sm text-slate-600 mt-1">Customer: {inq.buyer?.companyName || inq.buyer?.displayName || "Buyer"}</p>`;
const replacement2 = `<p className="text-sm text-slate-600 mt-1">Vendor: {inq.seller ? \`\${inq.seller.companyName} (\${inq.seller.displayName || 'User'})\` : "Multiple matching vendors"}</p>
                          <p className="text-sm text-slate-600 mt-1">Customer: {inq.buyer ? \`\${inq.buyer.companyName} (\${inq.buyer.displayName || 'User'})\` : "Buyer"}</p>`;
content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
