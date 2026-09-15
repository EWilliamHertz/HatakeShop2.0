const fs = require('fs');
let code = fs.readFileSync('src/components/AdminListings.tsx', 'utf-8');

// 1. Add state for UI and Filters
code = code.replace(
  'const [bulkSponsored, setBulkSponsored] = useState<string>(\'\');',
  `const [bulkSponsored, setBulkSponsored] = useState<string>('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');`
);

// 2. Fix the Assign Categories button
code = code.replace(
  /<button type="button" className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none min-w-\[200px\] text-left flex justify-between items-center">\s*<span>\{bulkCategoryIds\.length > 0 \? `\$\{bulkCategoryIds\.length\} categories selected` : '-- Assign Categories --'\}<\/span>\s*<\/button>\s*<div className="absolute top-full left-0 mt-1 w-\[300px\] max-h-\[300px\] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl hidden group-hover:block z-50 p-2">/m,
  `<button type="button" onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none min-w-[200px] text-left flex justify-between items-center">
    <span>{bulkCategoryIds.length > 0 ? \`\${bulkCategoryIds.length} categories selected\` : '-- Assign Categories --'}</span>
  </button>
  {isCategoryMenuOpen && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsCategoryMenuOpen(false)}></div>
      <div className="absolute top-full left-0 mt-1 w-[300px] max-h-[300px] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-2">
  `
);

// Close the absolute div correctly (it's open from the fragment)
code = code.replace(
  /                  Clear Selection\s*<\/button>\s*<\/div>\s*<\/div>/m,
  `                  Clear Selection
                </button>
              </div>
            </>
          )}
        </div>`
);

// 3. Add filters to the UI
code = code.replace(
  /onChange=\{e => setSearch\(e\.target\.value\)\}\s*className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200 transition-all"\s*\/>\s*<\/div>\s*<\/div>\s*<\/div>/m,
  `onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200 transition-all"
            />
          </div>
          
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="">All Categories</option>
            {Array.isArray(categoriesData) && categoriesData.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>`
);

// 4. Apply Filters & Sorting to filteredProducts
code = code.replace(
  /const filteredProducts = \(Array\.isArray\(products\) \? products : \[\]\)\.filter\(\(p: any\) => \s*p\.title\?\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\) \|\|\s*p\.seller\?\.companyName\?\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\)\s*\);/m,
  `const filteredProducts = (Array.isArray(products) ? products : []).filter((p: any) => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase()) || p.seller?.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === '' || p.categoryId?.toString() === filterCategory || (Array.isArray(p.categoryIds) && p.categoryIds.includes(parseInt(filterCategory)));
    const matchesStatus = filterStatus === '' || p.approvalStatus === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a: any, b: any) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'price_asc') return (parseFloat(a.unitCost) || 0) - (parseFloat(b.unitCost) || 0);
    if (sortBy === 'price_desc') return (parseFloat(b.unitCost) || 0) - (parseFloat(a.unitCost) || 0);
    return 0;
  });`
);

fs.writeFileSync('src/components/AdminListings.tsx', code);
console.log('Done!');
