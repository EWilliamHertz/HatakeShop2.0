const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(
  "  if (showOnboarding) {\n    return <Onboarding onComplete={() => setShowOnboarding(false)} />;\n  }\n\n  return (\n    <div className=\"relative w-full h-full group overflow-hidden\">",
  "  return (\n    <div className=\"relative w-full h-full group overflow-hidden\">"
);

code = code.replace(
  "  return (\n    <div className=\"min-h-screen bg-slate-950 flex flex-col pt-16\">",
  "  if (showOnboarding) {\n    return <Onboarding onComplete={() => setShowOnboarding(false)} />;\n  }\n\n  return (\n    <div className=\"min-h-screen bg-slate-950 flex flex-col pt-16\">"
);

fs.writeFileSync('src/pages/Home.tsx', code);
