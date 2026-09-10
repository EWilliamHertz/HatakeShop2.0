import fs from 'fs';
let content = fs.readFileSync('src/db/schema.ts', 'utf8');

// The simplest way is to restore it or just remove all the `}, (table) => {` blocks.
content = content.replace(/}, \(table\) => \{[\s\S]*?\}\);/g, '});');

fs.writeFileSync('src/db/schema.ts', content);
