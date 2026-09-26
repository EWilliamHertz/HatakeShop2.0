const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove the static import
code = code.replace("import { ProductPage } from './pages/ProductPage.tsx';\n", "");

// Add the dynamic import alongside the other lazy ones
const lazyMarker = "const SellerOnboarding = lazy(() => import('./pages/SellerOnboarding.tsx').then(m => ({ default: m.SellerOnboarding })));";
const newLazy = `const ProductPage = lazy(() => import('./pages/ProductPage.tsx').then(m => ({ default: m.ProductPage })));`;

if (!code.includes(newLazy)) {
  code = code.replace(lazyMarker, lazyMarker + '\n' + newLazy);
}

fs.writeFileSync('src/App.tsx', code);
