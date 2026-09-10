const fs = require('fs');
const file = 'vite.config.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `workbox: {`;
const replacement = `workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
