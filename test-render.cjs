const fs = require('fs');
const code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');
console.log(code.includes('animate={{ rotate: [0, 360] }}'));
