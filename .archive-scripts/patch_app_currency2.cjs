const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `import { CartProvider } from './components/SampleCart.tsx';`;
const replacement = `import { CartProvider } from './components/SampleCart.tsx';\nimport { CurrencyProvider } from './components/CurrencyContext.tsx';`;
content = content.replace(target, replacement);

fs.writeFileSync(file, content);
