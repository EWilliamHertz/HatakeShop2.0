const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

code = code.replace(
  '<span className="text-xl font-black tracking-tighter text-white">HATAKE</span>',
  '<img src="/logo.png" alt="Hatake" className="h-8 w-auto grayscale mix-blend-screen opacity-70" />'
);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
