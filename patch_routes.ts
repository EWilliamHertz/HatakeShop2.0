import * as fs from "fs";
import * as path from "path";

const routesDir = path.join(process.cwd(), "src", "routes");
const files = fs.readdirSync(routesDir);

const imports = `import express from "express";
import { getStripe, getEasyPost, resend, generateEmbedding, ai } from "../lib/services.js";
`;

for (const file of files) {
  if (file.endsWith(".ts")) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, "utf-8");
    if (!content.includes('import express from "express";')) {
       content = imports + "\n" + content;
       fs.writeFileSync(filePath, content);
    }
  }
}
console.log("Done");
