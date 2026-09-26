const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldText = `const text = typeof response.text === 'function' ? response.text() : response.text;`;
const newText = `const text = typeof response.text === 'function' ? (response as any).text() : response.text;`;

code = code.replace(oldText, newText);
fs.writeFileSync('server.ts', code);
