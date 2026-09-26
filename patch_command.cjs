const fs = require('fs');

let code = fs.readFileSync('src/components/CommandPalette.tsx', 'utf8');

if (!code.includes('open-command-palette')) {
  code = code.replace(
    "return () => window.removeEventListener('keydown', handleKeyDown);",
    `return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('open-command-palette', handleOpen); };`
  );
  
  code = code.replace(
    "const handleKeyDown = (e: KeyboardEvent) => {",
    "const handleOpen = () => setIsOpen(true);\n    window.addEventListener('open-command-palette', handleOpen);\n    const handleKeyDown = (e: KeyboardEvent) => {"
  );
  
  fs.writeFileSync('src/components/CommandPalette.tsx', code);
}
