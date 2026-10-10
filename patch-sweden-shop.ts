import fs from 'fs';
let content = fs.readFileSync('src/pages/SwedenShop.tsx', 'utf8');

content = content.replace(
  /img src=\{p\.images\[0\]\}/g,
  `img src={(p.sverigeImages && p.sverigeImages.length > 0) ? p.sverigeImages[0] : p.images[0]}`
);

content = content.replace(
  /p\.title/g,
  `(p.sverigeTitle || p.title)`
);

content = content.replace(
  /\{p\.unitCost\} kr/g,
  `{(p.sverigePrice || p.unitCost)} kr`
);

fs.writeFileSync('src/pages/SwedenShop.tsx', content);
