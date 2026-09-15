const fs = require('fs');
let content = fs.readFileSync('src/db/schema.ts', 'utf-8');

const oldCode = `oemMoq: integer('oem_moq').default(1),`;
const newCode = `oemMoq: integer('oem_moq').default(1),
  offersOem: boolean('offers_oem').default(false),`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('src/db/schema.ts', content);
  console.log("Patched schema.ts successfully");
} else {
  console.log("Could not find code block in schema.ts");
}
