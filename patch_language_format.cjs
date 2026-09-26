const fs = require('fs');

function formatLang(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  if (!code.includes('const formatLang =')) {
    code = code.replace('export default function', 'const formatLang = (l: string) => { if (l.toLowerCase() === "zh-hans") return "S-Chinese"; if (l.toLowerCase() === "zh-hant") return "T-Chinese"; return l; };\n\nexport default function');
  }

  code = code.replace(/{lang} \({count}\)/g, '{formatLang(lang)} ({count})');
  code = code.replace(/{item} \({count}\)/g, '{formatLang(item)} ({count})');
  
  fs.writeFileSync(file, code);
}

formatLang('src/pages/CompanyListings.tsx');
formatLang('src/pages/Storefront.tsx');
