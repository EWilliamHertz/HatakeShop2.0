const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /text: "I would like to get in touch\."/g,
  'messageContent: "I would like to get in touch."'
);

fs.writeFileSync('server.ts', code);
console.log("Fixed messageContent");
