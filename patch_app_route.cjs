const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { ProductPage }")) {
  code = code.replace(
    "import { Marketplace } from './pages/Marketplace.tsx';",
    "import { Marketplace } from './pages/Marketplace.tsx';\nimport { ProductPage } from './pages/ProductPage.tsx';"
  );
  fs.writeFileSync('src/App.tsx', code);
}
