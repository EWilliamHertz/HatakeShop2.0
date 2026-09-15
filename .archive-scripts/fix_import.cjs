const fs = require('fs');
const p = 'src/db/schema.ts';
let content = fs.readFileSync(p, 'utf8');
content = content.replace("customType } from 'drizzle-orm/pg-core'", "customType, index } from 'drizzle-orm/pg-core'");
fs.writeFileSync(p, content);
