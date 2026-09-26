const fs = require('fs');
let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

code = code.replace(
  '<p className="text-sm text-slate-300">You are <span className="font-bold text-white">€1,200</span> away from unlocking <span className="text-[#ffcc00] font-bold">Platinum Tier (5% off)</span>.</p>',
  '<p className="text-sm text-slate-300">You are <span className="font-bold text-white">€1,200</span> away from unlocking <span className="text-[#ffcc00] font-bold">Platinum Tier (Reduced Platform Commission)</span>.</p>'
);

fs.writeFileSync('src/components/SampleCart.tsx', code);
