const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

if (!code.includes('unitCost: ci.product.unitCost')) {
  code = code.replace(
    "quantity: ci.quantity, // For UI display if needed",
    "quantity: ci.quantity, // For UI display if needed\n              unitCost: ci.product.unitCost,"
  );
  fs.writeFileSync('src/pages/Onboarding.tsx', code);
}
