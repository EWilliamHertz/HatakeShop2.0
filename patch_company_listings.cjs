const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanyListings.tsx', 'utf8');

const earlyReturn = `  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
    </div>
  );`;

code = code.replace(earlyReturn, "");

// find where to put early return: right before `return (\n    <div className="min-h-screen bg-slate-950 pb-24">`
code = code.replace(
  "  return (\n    <div className=\"min-h-screen bg-slate-950 pb-24\">",
  earlyReturn + "\n\n  return (\n    <div className=\"min-h-screen bg-slate-950 pb-24\">"
);

fs.writeFileSync('src/pages/CompanyListings.tsx', code);
