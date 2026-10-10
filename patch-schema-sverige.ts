import fs from 'fs';

let content = fs.readFileSync('src/db/schema.ts', 'utf8');

content = content.replace(
  /isSverigeB2c: boolean\('is_sverige_b2c'\)\.default\(false\),/,
  `isSverigeB2c: boolean('is_sverige_b2c').default(false),\n  sverigePrice: numeric('sverige_price'),\n  sverigeImages: jsonb('sverige_images'),\n  sverigeTitle: text('sverige_title'),`
);

fs.writeFileSync('src/db/schema.ts', content);
