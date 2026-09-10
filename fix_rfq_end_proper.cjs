const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

const lastParen = code.lastIndexOf("  );");
code = code.substring(0, lastParen) + "    </div>\n  </div>\n  );\n}\n";
fs.writeFileSync('src/pages/RFQHub.tsx', code);
