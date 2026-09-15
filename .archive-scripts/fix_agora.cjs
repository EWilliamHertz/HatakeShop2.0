const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(`const appCertificate = process.env.AGORA_APP_CERTIFICATE || "e7c7261099e64c2596b8f00ca120a585";`, `const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";`);
fs.writeFileSync('server.ts', code);
