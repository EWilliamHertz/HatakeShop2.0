import fs from 'fs';
let content = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

content = content.replace(
  /\{p\.seller\?\.companyName \|\| 'Unknown'\}/,
  `{p.seller?.companyName || p.seller?.displayName || 'Unknown'}`
);

fs.writeFileSync('src/components/AdminListings.tsx', content);
