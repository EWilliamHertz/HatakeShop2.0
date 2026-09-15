const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
const seen = new Set();
const newLines = lines.filter(line => {
  if (line.includes("import { ErrorBoundary } from './components/ErrorBoundary.tsx';")) {
    if (seen.has('ErrorBoundary')) return false;
    seen.add('ErrorBoundary');
    return true;
  }
  return true;
});
fs.writeFileSync('src/App.tsx', newLines.join('\n'));
