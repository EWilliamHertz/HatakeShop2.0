const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(
  'if (maxPrice) conditions.push(lte(products.unitCost, parseFloat(maxPrice as string)));',
  'if (maxPrice) conditions.push(sql`CAST(${products.unitCost} AS numeric) <= ${parseFloat(maxPrice as string)}`);'
);
// Wait, is there another maxPrice or unitCost? Let's check for both.
code = code.replace(
  'if (maxPrice) conditions.push(lte(products.unitCost, parseFloat(maxPrice as string)));',
  'if (maxPrice) conditions.push(sql`CAST(${products.unitCost} AS numeric) <= ${parseFloat(maxPrice as string)}`);'
);
fs.writeFileSync('server.ts', code);
