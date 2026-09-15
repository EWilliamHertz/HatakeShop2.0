const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf-8');

// The line was: return { ...msg, content: translated };
// I will replace it with: return { ...msg, content: translated, originalContent: msg.content };

serverTs = serverTs.replace(
  "return { ...msg, content: translated };", 
  "return { ...msg, content: translated, originalContent: msg.content };"
);

fs.writeFileSync('server.ts', serverTs);
