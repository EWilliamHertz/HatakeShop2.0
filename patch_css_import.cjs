const fs = require('fs');
function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('import "./scrollbar.css";')) {
    code = code.replace(
      "import { useCurrency } from '../components/CurrencyProvider.tsx';",
      "import { useCurrency } from '../components/CurrencyProvider.tsx';\nimport './scrollbar.css';"
    );
    fs.writeFileSync(file, code);
  }
}
fix('src/pages/CompanyListings.tsx');
fix('src/pages/Storefront.tsx');
