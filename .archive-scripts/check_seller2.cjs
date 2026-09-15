const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');
const index = code.indexOf("activeTab === 'listings'");
console.log(code.substring(index - 200, index + 200));
