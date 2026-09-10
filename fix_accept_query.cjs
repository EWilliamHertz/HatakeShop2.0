const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const inquiryData = await db\.select\(\)\.from\(inquiries\)\.where\(and\(eq\(inquiries\.id, inquiryId\), or\(eq\(inquiries\.buyerId, userProfile\.id\), eq\(products\.sellerId, userProfile\.id\)\)\)\);/,
  `const inquiryData = await db.select().from(inquiries).where(eq(inquiries.id, inquiryId));`
);

fs.writeFileSync('server.ts', code);
console.log("Fixed accept query");
