const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

code = code.replace('useState("listings");\\n', 'useState("listings");\n');

fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
console.log("Success");
