const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /\s*<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\)\}/,
  ''
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
