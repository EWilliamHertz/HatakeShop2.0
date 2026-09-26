import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();
project.addSourceFileAtPath("server.ts");
const sourceFile = project.getSourceFileOrThrow("server.ts");

const startServerFn = sourceFile.getFunction("startServer");
const body = startServerFn?.getBody();

if (!body) throw new Error("No body");

const statements = body.getStatements();

const routes: Record<string, string[]> = {
  admin: [],
  auth: [],
  products: [],
  leads: [],
  webhooks: [],
  categories: [],
  other: []
};

for (const stmt of statements) {
  if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
    const expr = stmt.getFirstChildByKind(SyntaxKind.CallExpression);
    if (expr) {
      const propAccess = expr.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      if (propAccess && propAccess.getExpression().getText() === "app") {
        const method = propAccess.getName();
        if (["get", "post", "patch", "put", "delete"].includes(method)) {
          const args = expr.getArguments();
          if (args.length > 0 && args[0].getKind() === SyntaxKind.StringLiteral) {
            const routePath = args[0].getLiteralText();
            let matched = false;
            
            const mapping: Record<string, string> = {
              "/api-v2/admin": "admin",
              "/api-v2/auth": "auth",
              "/api-v2/products": "products",
              "/api-v2/leads": "leads",
              "/api-v2/webhooks": "webhooks",
              "/api-v2/stripe/webhook": "webhooks",
              "/api-v2/categories": "categories"
            };

            for (const [prefix, routerName] of Object.entries(mapping)) {
              if (routePath.startsWith(prefix)) {
                // Change app.get to router.get
                const text = stmt.getText().replace(/^app\./, "router.");
                routes[routerName].push(text);
                stmt.remove();
                matched = true;
                break;
              }
            }
            if (!matched) {
              // Leave other routes alone
            }
          }
        }
      }
    }
  }
}

sourceFile.saveSync();

for (const [name, texts] of Object.entries(routes)) {
  if (texts.length > 0 && name !== "other") {
    const fileContent = `import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, feedback, leads, affiliates, marketing_logs, categories, inquiries, inquiryMessages, reviews } from "../db/schema.js";
import { eq, or, ilike, sql, and, desc, isNotNull, inArray, ne, not, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireAdmin, requireSeller } from "../middleware/roles.js";
import crypto from "crypto";
import { generateB2BEmailHtml } from "../lib/emailTemplate.js";
import { getUserProfile } from "../db/users.js";

const router = Router();

${texts.join("\n\n")}

export default router;
`;
    fs.writeFileSync(path.join("src", "routes", `${name}.ts`), fileContent);
  }
}

console.log("Done");
