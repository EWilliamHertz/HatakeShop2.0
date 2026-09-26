const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldParse = `    const text = response.text();
    const json = JSON.parse(text || "{}");`;

const newParse = `    const text = response.text();
    const cleaned = text.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
    const json = JSON.parse(cleaned || "{}");`;

code = code.replace(oldParse, newParse);
fs.writeFileSync('server.ts', code);
