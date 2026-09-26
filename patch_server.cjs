const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('import developerRoutes')) {
  code = code.replace(
    "import sellerRoutes from './src/routes/seller.js';",
    "import sellerRoutes from './src/routes/seller.js';\nimport developerRoutes from './src/routes/developer.js';"
  );
  
  code = code.replace(
    "app.use(sellerRoutes);",
    "app.use(sellerRoutes);\napp.use('/api-v2', developerRoutes);"
  );
  fs.writeFileSync('server.ts', code);
}
