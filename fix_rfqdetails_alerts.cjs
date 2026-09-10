const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf8');

if (!code.includes("import { toast }")) {
   code = code.replace("import React,", "import React,\nimport { toast } from 'sonner';");
}
code = code.replace(/alert\(/g, 'toast.error(');

fs.writeFileSync('src/pages/RFQDetails.tsx', code);
