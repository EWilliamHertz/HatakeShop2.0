import fs from 'fs';
let content = fs.readFileSync('src/pages/SwedenShop.tsx', 'utf8');

content = content.replace(
  /image: p\.images\[0\],/,
  `image: (p.sverigeImages && p.sverigeImages.length > 0) ? p.sverigeImages[0] : p.images[0],`
);

content = content.replace(
  /unitCost: p\.unitCost,/,
  `unitCost: (p.sverigePrice || p.unitCost),`
);

fs.writeFileSync('src/pages/SwedenShop.tsx', content);
