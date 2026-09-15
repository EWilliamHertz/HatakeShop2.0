const fs = require('fs');
let content = fs.readFileSync('src/db/schema.ts', 'utf-8');

const oldVat = "vatNumber: text('vat_number'),";
const newVat = "vatNumber: text('vat_number'),\n  region: text('region'),\n  companyFocus: text('company_focus'),";

if (content.includes(oldVat)) {
  content = content.replace(oldVat, newVat);
  fs.writeFileSync('src/db/schema.ts', content);
  console.log("Patched schema");
} else {
  console.log("Could not find line in schema");
}
