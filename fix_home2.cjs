const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(
  "  return (\n    <div className=\"bg-slate-950 min-h-screen pb-20 flex flex-col\">",
  "  if (showOnboarding) {\n    return <Onboarding onComplete={() => setShowOnboarding(false)} />;\n  }\n\n  return (\n    <div className=\"bg-slate-950 min-h-screen pb-20 flex flex-col\">"
);

fs.writeFileSync('src/pages/Home.tsx', code);
