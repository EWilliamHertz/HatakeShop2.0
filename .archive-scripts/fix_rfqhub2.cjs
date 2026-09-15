const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

code = code.replace(/    <\/\\n    <\/div>\\n  \);\\n\}\\n$/, "    </div>\\n  );\\n}\\n");
code = code.replace(/    <\/\\n    <\/div>\\n  \);\\n\}\\n$/, "    </div>\\n  );\\n}\\n");

// Just to be sure, let's fix it manually by regex matching the whole end:
code = code.replace(/ {7}\}\\n {4}<\/div>\\n  <\/div>\\n  \)\}$/m, '       )}\n    </div>\n  );\n}');

fs.writeFileSync('src/pages/RFQHub.tsx', code);
