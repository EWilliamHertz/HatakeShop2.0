const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(
  'const routers = [adminRouter, authRouter, productsRouter, leadsRouter, webhooksRouter, categoriesRouter];',
  'const routers = [adminRouter, authRouter, productsRouter, sellerRouter, profileRouter, rfqsRouter, leadsRouter, webhooksRouter, categoriesRouter];'
);
fs.writeFileSync('server.ts', code);
