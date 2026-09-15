const fs = require('fs');

let route = fs.readFileSync('src/routes/products.ts', 'utf8');

// Update filter condition
route = route.replace(
  /conditions\.push\(inArray\(products\.categoryId, catIds\)\);/,
  "conditions.push(or(inArray(products.categoryId, catIds), sql`${products.categoryIds} && ARRAY[${sql.join(catIds.map(id => sql`${id}`), sql`, `)}]::int[]`));"
);

// We need 'or' and 'sql' in products.ts if not there
if (!route.includes('or,')) {
    route = route.replace(/import \{ (.*?) \} from "drizzle-orm";/, 'import { $1, or, sql } from "drizzle-orm";');
}

// In the select clause, let's also fetch categoryIds
route = route.replace(
  /categoryId: products\.categoryId,/,
  "categoryId: products.categoryId,\n          categoryIds: products.categoryIds,"
);

fs.writeFileSync('src/routes/products.ts', route);
console.log("Patched products.ts");
