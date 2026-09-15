const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');
code = code.replace(`window.location.href = data.url;`, `window.open(data.url, '_blank');`);
fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
