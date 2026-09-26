const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Remove the 'types' useMemo extraction
  // Actually, keeping the variable in useMemo is fine, just remove the JSX rendering.
  // Or remove the JSX first:
  
  const typesJsx = /\{\/\* Type pills \*\/\}(.|\n)*?<\/div>\n\s*\)\}/m;
  code = code.replace(typesJsx, "");
  
  // Also remove the second set of Types pills in case my regex didn't catch the exact format
  const typesJsxStorefront = /\{\/\* Type pills \*\/\}\s*\{types\.length > 0 && \(\s*<div className="flex flex-wrap items-center gap-2">\s*<Box className="w-4 h-4 text-slate-500 shrink-0" \/>\s*\{types\.map\(\(\[typ, count\]\) => \(\s*<button\s*key=\{typ\}\s*onClick=\{[^}]+\}\s*className=\{[^}]+\}\s*>\s*\{typ\} \(\{count\}\)\s*<\/button>\s*\)\)\}\s*<\/div>\s*\)\}/g;
  code = code.replace(typesJsxStorefront, "");

  // Make spacing more spacious
  code = code.replace(/<div className="flex flex-col gap-3( w-full)?"/g, '<div className="flex flex-col gap-5$1"');
  code = code.replace(/<div className="flex flex-wrap items-center gap-2"/g, '<div className="flex flex-wrap items-center gap-3"');
  
  // Make pills larger
  code = code.replace(/px-3 py-1\.5 rounded-xl text-xs/g, 'px-4 py-2 rounded-2xl text-sm');
  
  fs.writeFileSync(file, code);
}

patchFile('src/pages/CompanyListings.tsx');
patchFile('src/pages/Storefront.tsx');
