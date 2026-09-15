const fs = require('fs');

let rfq = fs.readFileSync('src/routes/rfqs.ts', 'utf-8');
rfq = rfq.replace(
  'import { getStripe, generateB2BEmailHtml, resend } from "../lib/services.js";',
  'import { getStripe, resend } from "../lib/services.js";\nimport { generateB2BEmailHtml } from "../lib/emailTemplate.js";'
);
fs.writeFileSync('src/routes/rfqs.ts', rfq);

console.log("Fixed rfqs import");
