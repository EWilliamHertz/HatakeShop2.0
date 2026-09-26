const fs = require('fs');
let code = fs.readFileSync('src/pages/Storefront.tsx', 'utf8');

// 1. Add brands extraction to useMemo
code = code.replace(
  `const typs: Record<string, number> = {};`,
  `const typs: Record<string, number> = {};\n    const brnds: Record<string, number> = {};`
);

code = code.replace(
  `const typ = p?.sealedType || p?.productType || 'Unknown';`,
  `const typ = p?.sealedType || p?.productType || 'Unknown';\n      const brnd = p?.brand;\n      if (brnd) brnds[brnd] = (brnds[brnd] || 0) + 1;`
);

code = code.replace(
  `types: Object.entries(typs).sort((a, b) => b[1] - a[1]),`,
  `types: Object.entries(typs).sort((a, b) => b[1] - a[1]),\n      brands: Object.entries(brnds).sort((a, b) => b[1] - a[1]),`
);

code = code.replace(
  `const { categories, languages, types } = useMemo(() => {`,
  `const { categories, languages, types, brands } = useMemo(() => {`
);

// 2. Add brand filtering logic
code = code.replace(
  `const selectedLanguages = searchParams.get('languages') ? searchParams.get('languages')!.split(',') : [];`,
  `const selectedLanguages = searchParams.get('languages') ? searchParams.get('languages')!.split(',') : [];\n  const selectedBrands = searchParams.get('brands') ? searchParams.get('brands')!.split(',') : [];`
);

code = code.replace(
  `const matchesLang = selectedLanguages.length === 0 || selectedLanguages.includes(pLang);`,
  `const matchesLang = selectedLanguages.length === 0 || selectedLanguages.includes(pLang);\n      const pBrnd = p?.brand;\n      const matchesBrand = selectedBrands.length === 0 || (pBrnd && selectedBrands.includes(pBrnd));`
);

code = code.replace(
  `return matchesSearch && matchesCat && matchesLang && matchesTyp;`,
  `return matchesSearch && matchesCat && matchesLang && matchesTyp && matchesBrand;`
);

// 3. Update the UI to be neat and scrollable, and add the brands row
const oldFiltersUI = `            {/* Category pills */}
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <Tag className="w-4 h-4 text-slate-500 shrink-0" />
                {categories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => toggleMultiParam('categories', cat)}
                    className={\`px-4 py-2 rounded-2xl text-sm font-semibold transition-all \${selectedCategories.includes(cat) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}\`}
                  >
                    {cat} ({count})
                  </button>
                ))}
              </div>
            )}
            {/* Language pills */}
            {languages.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-4 text-center">L</span>
                {languages.map(([lang, count]) => (
                  <button
                    key={lang}
                    onClick={() => toggleMultiParam('languages', lang)}
                    className={\`px-4 py-2 rounded-2xl text-sm font-semibold transition-all \${selectedLanguages.includes(lang) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}\`}
                  >
                    {formatLang(lang)} ({count})
                  </button>
                ))}
              </div>
            )}`;

const newFiltersUI = `            {/* Brand pills */}
            {brands.length > 0 && (
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar pb-2 items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 shrink-0">IP</span>
                {brands.map(([brand, count]) => (
                  <button
                    key={brand}
                    onClick={() => toggleMultiParam('brands', brand)}
                    className={\`px-4 py-2 rounded-2xl text-sm font-semibold transition-all shrink-0 \${selectedBrands.includes(brand) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}\`}
                  >
                    {brand} ({count})
                  </button>
                ))}
              </div>
            )}
            {/* Category pills */}
            {categories.length > 0 && (
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar pb-2 items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 shrink-0">Type</span>
                {categories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => toggleMultiParam('categories', cat)}
                    className={\`px-4 py-2 rounded-2xl text-sm font-semibold transition-all shrink-0 \${selectedCategories.includes(cat) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}\`}
                  >
                    {cat} ({count})
                  </button>
                ))}
              </div>
            )}
            {/* Language pills */}
            {languages.length > 0 && (
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar pb-2 items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 shrink-0">Lang</span>
                {languages.map(([lang, count]) => (
                  <button
                    key={lang}
                    onClick={() => toggleMultiParam('languages', lang)}
                    className={\`px-4 py-2 rounded-2xl text-sm font-semibold transition-all shrink-0 \${selectedLanguages.includes(lang) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}\`}
                  >
                    {formatLang(lang)} ({count})
                  </button>
                ))}
              </div>
            )}`;

code = code.replace(oldFiltersUI, newFiltersUI);

// 4. Inject no-scrollbar CSS if not present
if (!code.includes('.no-scrollbar::-webkit-scrollbar')) {
  code = code.replace('export default function', 'import "./scrollbar.css";\nexport default function');
}

fs.writeFileSync('src/pages/Storefront.tsx', code);
