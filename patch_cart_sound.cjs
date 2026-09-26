const fs = require('fs');
let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

if (!code.includes('playSound')) {
  // Add import
  code = code.replace(
    "import { toast } from 'sonner';",
    "import { toast } from 'sonner';\nimport { playSound } from '../lib/soundDesign.ts';"
  );
  
  // Find where items are added
  code = code.replace(
    "setItems(prev => {",
    "playSound('pop');\n    setItems(prev => {"
  );
  
  fs.writeFileSync('src/components/SampleCart.tsx', code);
}
