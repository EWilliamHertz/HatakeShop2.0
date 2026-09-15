const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf-8');
const lines = serverContent.split('\n');

const profileRoutes = lines.slice(581, 776).join('\n'); // 582 to 776

// Create src/routes/profile.ts
const profileFile = `import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, reviews, leads } from "../db/schema.js";
import { eq, or, and, isNull } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getUserProfile, updateUserProfile } from "../db/users.js";

const router = Router();

${profileRoutes.replace(/app\./g, 'router.')}

export default router;
`;

fs.writeFileSync('src/routes/profile.ts', profileFile);

// Remove from server.ts
lines.splice(581, 195);
let newServerContent = lines.join('\n');

// Inject the import and router registration
newServerContent = newServerContent.replace(
  'import sellerRouter from "./src/routes/seller.js";',
  'import sellerRouter from "./src/routes/seller.js";\nimport profileRouter from "./src/routes/profile.js";'
);
newServerContent = newServerContent.replace(
  ', sellerRouter];',
  ', sellerRouter, profileRouter];'
);

fs.writeFileSync('server.ts', newServerContent);
console.log("Profile routes extracted to src/routes/profile.ts");
