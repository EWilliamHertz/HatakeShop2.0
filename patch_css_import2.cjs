const fs = require('fs');
function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('import "./scrollbar.css";')) {
    code = code.replace(
      "import { VendorReviews } from '../components/VendorReviews.tsx';",
      "import { VendorReviews } from '../components/VendorReviews.tsx';\nimport './scrollbar.css';"
    );
    fs.writeFileSync(file, code);
  }
}
fix('src/pages/Storefront.tsx');
