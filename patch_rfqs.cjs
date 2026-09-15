const fs = require('fs');
let code = fs.readFileSync('src/routes/rfqs.ts', 'utf-8');
code = code.replace(
  'import { users, products, inquiries, inquiryMessages, leads } from "../db/schema.js";',
  'import { users, products, inquiries, inquiryMessages, leads, reviews } from "../db/schema.js";'
);
code = code.replace(
  'import { not, eq, or, and, isNull, desc } from "drizzle-orm";',
  'import { not, eq, or, and, isNull, desc, inArray, asc } from "drizzle-orm";'
);
code = code.replace(
  'import { generateB2BEmailHtml } from "../lib/emailTemplate.js";',
  'import { generateB2BEmailHtml } from "../lib/emailTemplate.js";\nimport { adminDb } from "../lib/firebase-admin.js";'
);
fs.writeFileSync('src/routes/rfqs.ts', code);
