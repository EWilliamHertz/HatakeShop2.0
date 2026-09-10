const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `import { CartProvider } from './components/CartContext.tsx';`;
const replacement = `import { CartProvider } from './components/CartContext.tsx';
import { CurrencyProvider } from './components/CurrencyContext.tsx';`;
content = content.replace(target, replacement);

const target2 = `<CartProvider>`;
const replacement2 = `<CurrencyProvider>
      <CartProvider>`;
content = content.replace(target2, replacement2);

const target3 = `</CartProvider>`;
const replacement3 = `</CartProvider>
      </CurrencyProvider>`;
content = content.replace(target3, replacement3);

fs.writeFileSync(file, content);
