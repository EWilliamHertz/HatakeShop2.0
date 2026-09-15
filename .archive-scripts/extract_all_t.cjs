const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
const keys = new Set();
const regex = /t\(['"]([^'"]+)['"]\)/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
});

// Also manually add from our previous list just in case we missed them (e.g. from props)
const prevKeys = JSON.parse(fs.readFileSync('i18n_keys.json', 'utf8'));
prevKeys.forEach(k => keys.add(k));

fs.writeFileSync('all_extracted_keys.json', JSON.stringify(Array.from(keys), null, 2));
