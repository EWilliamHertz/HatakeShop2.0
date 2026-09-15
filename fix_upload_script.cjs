const fs = require('fs');

let script = fs.readFileSync('upload_products.ts', 'utf-8');
script = 'import "dotenv/config";\n' + script;
fs.writeFileSync('upload_products.ts', script);

console.log("Fixed upload script");
