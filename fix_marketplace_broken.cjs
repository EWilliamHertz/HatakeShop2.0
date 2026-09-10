const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

// Fix nested t()
code = code.replace(/\{t\('\{t\('([^']+)'\)\}'\)\}/g, "{t('$1')}");

// Fix the line 840 ( Supplier/Factory Origin )
// {t('Supplier/Factory {t('Origin')}')}
code = code.replace(/\{t\('Supplier\/Factory \{t\('Origin'\)'\)\}/g, "{t('Supplier/Factory Origin')}");
code = code.replace(/\{t\('Supplier\/Factory \{t\('Origin'\)\}'\)\}/g, "{t('Supplier/Factory Origin')}");

fs.writeFileSync('src/pages/Marketplace.tsx', code);
