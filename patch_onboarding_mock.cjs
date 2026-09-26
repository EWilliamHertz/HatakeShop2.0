const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

code = code.replace(/const MOCK_PRODUCTS = \[[^\]]+\];/m, 'const MOCK_PRODUCTS: any[] = [];');

fs.writeFileSync('src/pages/Onboarding.tsx', code);
