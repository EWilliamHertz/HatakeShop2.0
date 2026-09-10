import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();
project.addSourceFileAtPath("server.ts");
const sourceFile = project.getSourceFileOrThrow("server.ts");

// Add imports
sourceFile.addImportDeclarations([
  { moduleSpecifier: "./src/routes/admin.js", defaultImport: "adminRouter" },
  { moduleSpecifier: "./src/routes/auth.js", defaultImport: "authRouter" },
  { moduleSpecifier: "./src/routes/products.js", defaultImport: "productsRouter" },
  { moduleSpecifier: "./src/routes/leads.js", defaultImport: "leadsRouter" },
  { moduleSpecifier: "./src/routes/webhooks.js", defaultImport: "webhooksRouter" },
  { moduleSpecifier: "./src/routes/categories.js", defaultImport: "categoriesRouter" },
]);

const startServerFn = sourceFile.getFunction("startServer");
const body = startServerFn?.getBody();

if (body) {
  const stmts = body.getStatements();
  const appDeclIndex = stmts.findIndex(s => s.getText().includes("const app = express()"));
  if (appDeclIndex !== -1) {
    body.insertStatements(appDeclIndex + 1, [
      "app.use('/', adminRouter);",
      "app.use('/', authRouter);",
      "app.use('/', productsRouter);",
      "app.use('/', leadsRouter);",
      "app.use('/', webhooksRouter);",
      "app.use('/', categoriesRouter);"
    ]);
  }
}

sourceFile.saveSync();
console.log("Patched");
