const fs = require('fs');
const content = fs.readFileSync('src/i18n.ts', 'utf8');

// Regex to extract the en: { translation: { ... } } block
// We can just execute a simplified version or extract the keys
let keys = [];
const enMatch = content.match(/en:\s*\{\s*translation:\s*\{([\s\S]*?)\}\s*\},/);
if (enMatch) {
    const enContent = enMatch[1];
    const keyRegex = /"([^"]+)":/g;
    let match;
    while ((match = keyRegex.exec(enContent)) !== null) {
        keys.push(match[1]);
    }
}
fs.writeFileSync('i18n_keys.json', JSON.stringify(keys, null, 2));
