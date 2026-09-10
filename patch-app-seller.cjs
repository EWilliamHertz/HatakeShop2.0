const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = "import { SellerOnboarding } from './pages/SellerOnboarding.tsx';\n" + code;
code = code.replace('<Route path="/seller" element=', '<Route path="/apply-seller" element={<ProtectedRoute><SellerOnboarding /></ProtectedRoute>} />\n            <Route path="/seller" element=');
fs.writeFileSync('src/App.tsx', code);
