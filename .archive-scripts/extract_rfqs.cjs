const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf-8');
const lines = serverContent.split('\n');

const rfqRoutes = lines.slice(1196, 1946).join('\n'); // 1197 to 1946

// Create src/routes/rfqs.ts
const rfqFile = `import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, inquiries, inquiryMessages, leads } from "../db/schema.js";
import { eq, or, and, isNull, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getUserProfile } from "../db/users.js";
import { getStripe, generateB2BEmailHtml, resend } from "../lib/services.js";

const router = Router();

${rfqRoutes.replace(/app\./g, 'router.')}

export default router;
`;

fs.writeFileSync('src/routes/rfqs.ts', rfqFile);

// Remove from server.ts
lines.splice(1196, 750); // Remove 750 lines starting from 1196
let newServerContent = lines.join('\n');

// Inject the import and router registration
newServerContent = newServerContent.replace(
  'import profileRouter from "./src/routes/profile.js";',
  'import profileRouter from "./src/routes/profile.js";\nimport rfqsRouter from "./src/routes/rfqs.js";'
);
newServerContent = newServerContent.replace(
  ', profileRouter];',
  ', profileRouter, rfqsRouter];'
);

fs.writeFileSync('server.ts', newServerContent);
console.log("RFQ routes extracted to src/routes/rfqs.ts");
