const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

const lastParen = code.lastIndexOf("  );");
code = code.substring(0, lastParen) + "      </div>\n    </div>\n  );\n}\n";
fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
