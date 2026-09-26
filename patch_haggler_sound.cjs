const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf8');

if (!code.includes('playSound(')) {
  code = code.replace(
    "import { ContractModal } from '../components/ContractModal.tsx';",
    "import { ContractModal } from '../components/ContractModal.tsx';\nimport { playSound } from '../lib/soundDesign.ts';"
  );
  
  code = code.replace(
    "toast.success(\"AI Auto-Haggler activated for this Deal Room.\");",
    "playSound('success');\n                     toast.success(\"AI Auto-Haggler activated for this Deal Room.\");"
  );
  
  fs.writeFileSync('src/pages/RFQDetails.tsx', code);
}
