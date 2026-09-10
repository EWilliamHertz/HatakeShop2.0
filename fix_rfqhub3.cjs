const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

code = code.replace(/    <\/div>\\n  \);\\n\}\\n$/, "    </div>\n  );\n}\n");

fs.writeFileSync('src/pages/RFQHub.tsx', code);
