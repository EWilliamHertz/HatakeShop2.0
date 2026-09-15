const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');
code = code.replace("import { useAuth }\nimport { toast } from 'sonner'; from '../components/AuthContext.tsx';", "import { useAuth } from '../components/AuthContext.tsx';\nimport { toast } from 'sonner';");
fs.writeFileSync('src/pages/Settings.tsx', code);
