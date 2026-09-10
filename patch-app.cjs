const fs = require('fs');
let appTs = fs.readFileSync('src/App.tsx', 'utf-8');

if (!appTs.includes('SellerOnboarding')) {
  appTs = appTs.replace('import { SellerDashboard } from "./pages/SellerDashboard.tsx";', 'import { SellerDashboard } from "./pages/SellerDashboard.tsx";\nimport { SellerOnboarding } from "./pages/SellerOnboarding.tsx";');
  appTs = appTs.replace('<Route path="/seller" element={<SellerDashboard />} />', '<Route path="/seller" element={<SellerDashboard />} />\n        <Route path="/apply-seller" element={<SellerOnboarding />} />');
  fs.writeFileSync('src/App.tsx', appTs);
}
