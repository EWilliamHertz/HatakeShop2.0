const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

code = code.replace(
  'console.log(`Successfully synced ${data.length} products`);',
  'console.log("Successfully synced " + data.length + " products");'
);

fs.writeFileSync('src/pages/Settings.tsx', code);
