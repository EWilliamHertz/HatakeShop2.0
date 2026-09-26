const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('CommandPalette')) {
  // Add import
  code = code.replace(
    "import { CartDrawer } from './components/SampleCart';",
    "import { CartDrawer } from './components/SampleCart';\nimport { CommandPalette } from './components/CommandPalette';"
  );
  
  // Inject component before closing div
  code = code.replace(
    "          <CartDrawer />\n        </div>",
    "          <CartDrawer />\n          <CommandPalette />\n        </div>"
  );
  
  fs.writeFileSync('src/App.tsx', code);
}
