const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

const regex = /       \)}\n[\s\S]*$/m;
code = code.replace(regex, "       )}\n    </div>\n  </div>\n  );\n}\n");

fs.writeFileSync('src/pages/RFQHub.tsx', code);
