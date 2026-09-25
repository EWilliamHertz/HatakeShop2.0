const fs = require('fs');
let code = fs.readFileSync('src/components/AdminListings.tsx', 'utf-8');

// Fix mutation
code = code.replace(
  /mutationFn: async \(updates: any\) => \{[\s\S]*?body: JSON\.stringify\(\{ productIds: selectedIds, updates \}\)/,
  `mutationFn: async (payload: { productIds: string[], updates: any }) => {
      let token; try { token = await user?.getIdToken(); } catch(e) {}
      const res = await fetch('/api-v2/admin/products/bulk', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\` 
        },
        body: JSON.stringify(payload)`
);

// Remove overflow-hidden from root
code = code.replace(
  /<div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">/,
  '<div className="bg-slate-800 border border-slate-700 rounded-2xl">'
);

// Add sticky wrapper to headers
code = code.replace(
  /<div className="bg-slate-900 p-5 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">/,
  `<div className="sticky top-0 z-20 flex flex-col">
        <div className="bg-slate-900 p-5 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-t-2xl">`
);

// Close sticky wrapper after the bulk actions bar
code = code.replace(
  /<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*\)}/,
  `            </button>
          </div>
        </div>
      )}
      </div>`
);

fs.writeFileSync('src/components/AdminListings.tsx', code);
console.log("Updated AdminListings.tsx");
