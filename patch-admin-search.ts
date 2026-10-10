import fs from 'fs';
let content = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

content = content.replace(
  /const matchesSearch = p\.title\?\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\) \|\| p\.seller\?\.companyName\?\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\);/,
  `const searchLower = search.toLowerCase();
    const matchesSearch = p.title?.toLowerCase().includes(searchLower) || 
                          p.seller?.companyName?.toLowerCase().includes(searchLower) ||
                          p.seller?.displayName?.toLowerCase().includes(searchLower) ||
                          p.seller?.email?.toLowerCase().includes(searchLower);`
);

fs.writeFileSync('src/components/AdminListings.tsx', content);
