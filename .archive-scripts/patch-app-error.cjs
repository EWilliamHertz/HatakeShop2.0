const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = "import { ErrorBoundary } from './components/ErrorBoundary.tsx';\n" + code;
code = code.replace('<Router>', '<Router>\n      <ErrorBoundary>');
code = code.replace('</Router>', '  </ErrorBoundary>\n    </Router>');
fs.writeFileSync('src/App.tsx', code);
