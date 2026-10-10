import fs from 'fs';
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (!content.includes("import { AdminSverigeTab }")) {
  content = content.replace(
    /import \{ AdminListings \} from '\.\.\/components\/AdminListings\.tsx';/,
    `import { AdminListings } from '../components/AdminListings.tsx';\nimport { AdminSverigeTab } from '../components/AdminSverigeTab.tsx';`
  );
}

content = content.replace(
  /\{activeTab === 'sverige' && \(\s*<div className="bg-slate-800[^>]+>\s*<div[^>]+>\s*<h2[^>]+>Hatake Sverige B2C Toggle<\/h2>\s*<\/div>\s*<p[^>]+>[\s\S]*?<\/p>\s*<\/div>\s*\)\}/,
  `{activeTab === 'sverige' && <AdminSverigeTab />}`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
