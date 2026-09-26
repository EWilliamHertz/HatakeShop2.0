const fs = require('fs');
let code = fs.readFileSync('src/components/CommandPalette.tsx', 'utf8');

if (!code.includes('playSound')) {
  // Add import
  code = code.replace(
    "import { useCart } from './SampleCart';",
    "import { useCart } from './SampleCart';\nimport { playSound } from '../lib/soundDesign.ts';"
  );
  
  code = code.replace(
    "const handleQuickAdd = (product: any) => {",
    "const handleQuickAdd = (product: any) => {\n    playSound('click');"
  );
  
  fs.writeFileSync('src/components/CommandPalette.tsx', code);
}
