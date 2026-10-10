import fs from 'fs';
let content = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

// 1. Add state for filterCompany
content = content.replace(
  /const \[filterSponsored, setFilterSponsored\] = useState\(''\);/,
  `const [filterSponsored, setFilterSponsored] = useState('');\n  const [filterCompany, setFilterCompany] = useState('');`
);

// 2. Add filterCompany to matches filter logic
content = content.replace(
  /const matchesSponsored = filterSponsored === '' \|\| \(filterSponsored === 'true' \? p\.isSponsored : !p\.isSponsored\);/,
  `const matchesSponsored = filterSponsored === '' || (filterSponsored === 'true' ? p.isSponsored : !p.isSponsored);\n    const matchesCompany = filterCompany === '' || p.sellerId?.toString() === filterCompany;`
);

content = content.replace(
  /return matchesSearch && matchesCategory && matchesStatus && matchesLanguage && matchesSealedType && matchesProductType && matchesOrigin && matchesSponsored;/,
  `return matchesSearch && matchesCategory && matchesStatus && matchesLanguage && matchesSealedType && matchesProductType && matchesOrigin && matchesSponsored && matchesCompany;`
);

// 3. Extract unique companies for the dropdown options
content = content.replace(
  /const filteredProducts = /,
  `const uniqueCompanies = Array.from(new Map((Array.isArray(products) ? products : []).filter((p:any) => p.seller).map((p:any) => [p.seller.id, p.seller])).values());\n\n  const filteredProducts = `
);

// 4. Add the dropdown to the UI next to filterCategory
content = content.replace(
  /<select\s*value=\{filterCategory\}\s*onChange=\{\(e\) => setFilterCategory\(e\.target\.value\)\}/,
  `<select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-cyan-500">
            <option value="">All Sellers/Companies</option>
            {uniqueCompanies.map((s: any) => (
              <option key={s.id} value={s.id}>{s.companyName || s.displayName || s.email}</option>
            ))}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}`
);

fs.writeFileSync('src/components/AdminListings.tsx', content);
