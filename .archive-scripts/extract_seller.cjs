const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf-8');

const lines = serverContent.split('\n');

const sellerRoutes = lines.slice(459, 733).join('\n'); // 460 to 733

// Create src/routes/seller.ts
const sellerFile = `import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, inquiries, orders } from "../db/schema.js";
import { eq, or, and, desc, sql, inArray, ilike } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireSeller } from "../middleware/roles.js";
import { getUserProfile } from "../db/users.js";
import { generateEmbedding } from "../lib/services.js";

const router = Router();

${sellerRoutes.replace(/app\./g, 'router.')}

export default router;
`;

fs.writeFileSync('src/routes/seller.ts', sellerFile);

// Remove from server.ts
lines.splice(459, 274); // Remove 274 lines starting from index 459
let newServerContent = lines.join('\n');

// Inject the import and router registration
newServerContent = newServerContent.replace(
  'import productsRouter from "./src/routes/products.js";',
  'import productsRouter from "./src/routes/products.js";\nimport sellerRouter from "./src/routes/seller.js";'
);
newServerContent = newServerContent.replace(
  'const routers = [adminRouter, authRouter, productsRouter, leadsRouter, webhooksRouter, categoriesRouter];',
  'const routers = [adminRouter, authRouter, productsRouter, leadsRouter, webhooksRouter, categoriesRouter, sellerRouter];'
);

fs.writeFileSync('server.ts', newServerContent);
console.log("Seller routes extracted to src/routes/seller.ts");
