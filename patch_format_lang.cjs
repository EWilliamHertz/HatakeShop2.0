const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('const formatLang =')) {
    code = code.replace(
      "import { useCurrency } from '../components/CurrencyProvider.tsx';",
      "import { useCurrency } from '../components/CurrencyProvider.tsx';\n\nconst formatLang = (l: string) => {\n  if (!l) return l;\n  if (l.toLowerCase() === 'zh-hans') return 'S-Chinese';\n  if (l.toLowerCase() === 'zh-hant') return 'T-Chinese';\n  return l;\n};\n"
    );
    fs.writeFileSync(file, code);
  }
}

fix('src/pages/CompanyListings.tsx');
fix('src/pages/Storefront.tsx');
