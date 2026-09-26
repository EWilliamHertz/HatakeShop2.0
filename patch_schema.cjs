const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

if (!code.includes('apiKey: text(\'api_key\')')) {
  code = code.replace(
    "storePolicies: text('store_policies'),",
    "storePolicies: text('store_policies'),\n  apiKey: text('api_key').unique(),"
  );
  fs.writeFileSync('src/db/schema.ts', code);
}
