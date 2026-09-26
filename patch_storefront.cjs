const fs = require('fs');
let code = fs.readFileSync('src/pages/Storefront.tsx', 'utf8');

const earlyReturns = `  if (loading) return <div className="p-12 text-center text-slate-400">Loading storefront...</div>;
  if (!storeData?.store) return <div className="p-12 text-center text-slate-400 font-medium">Store not found.</div>;`;

code = code.replace(earlyReturns, "");

// find where to put early return: right before `return (\n    <div className="min-h-screen bg-slate-950 pb-24">`
code = code.replace(
  "  return (\n    <div className=\"min-h-screen bg-slate-950 pb-24\">",
  earlyReturns + "\n\n  return (\n    <div className=\"min-h-screen bg-slate-950 pb-24\">"
);

fs.writeFileSync('src/pages/Storefront.tsx', code);
