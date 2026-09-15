const fs = require('fs');

let adminCode = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

adminCode = adminCode.replace(
  /\['overview', 'approvals', 'users', 'marketing', 'affiliates', 'leads', 'feedback', 'reviews'\]/,
  "['overview', 'approvals', 'listings', 'users', 'marketing', 'affiliates', 'leads', 'feedback', 'reviews']"
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', adminCode);
console.log("Patched inline tabs array in AdminDashboard.tsx");
