const fs = require('fs');
let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

code = code.replace(
  'className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 shrink-0"',
  'className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-xl transition-colors shrink-0"'
);

fs.writeFileSync('src/components/SampleCart.tsx', code);
