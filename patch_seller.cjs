const fs = require('fs');
let code = fs.readFileSync('src/routes/seller.ts', 'utf-8');
code = code.replace(
  'import { users, products, inquiries, orders } from "../db/schema.js";',
  'import { users, products, inquiries, orders, categories } from "../db/schema.js";'
);
code = code.replace(/      embedding,\n/g, '');
code = code.replace(/        embedding,\n/g, '');
code = code.replace(/      unitCost: isNaN\(parsedCost\) \? 0 : parsedCost,/g, '      unitCost: isNaN(parsedCost) ? "0" : parsedCost.toString(),');
code = code.replace(/        unitCost: isNaN\(parsedCost\) \? 0 : parsedCost,/g, '        unitCost: isNaN(parsedCost) ? "0" : parsedCost.toString(),');
fs.writeFileSync('src/routes/seller.ts', code);
