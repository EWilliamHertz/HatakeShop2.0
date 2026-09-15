const fs = require('fs');

let schema = fs.readFileSync('src/db/schema.ts', 'utf8');

schema = schema.replace(
  /categoryId: integer\('category_id'\),/,
  "categoryId: integer('category_id'),\n  categoryIds: integer('category_ids').array().default(sql`'{}'::int[]`),"
);

fs.writeFileSync('src/db/schema.ts', schema);
console.log("Patched schema");
