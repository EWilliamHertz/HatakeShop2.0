const fs = require('fs');
const file = 'src/components/VideoTour.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the refs
content = content.replace(/useRef<HTMLVideoElement>\(null\)/g, 'useRef<HTMLDivElement>(null)');

// And the import meta env thing we already fixed. Let's make sure it's correct.
fs.writeFileSync(file, content);
