const fs = require('fs');
let code = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

// Change state from string to array
code = code.replace(
  /const \[bulkCategory, setBulkCategory\] = useState\(""\);/,
  "const [bulkCategoryIds, setBulkCategoryIds] = useState<number[]>([]);"
);

// Change handleBulkUpdate logic
code = code.replace(
  /if \(bulkCategory\) updates\.categoryId = bulkCategory === 'null' \? null : parseInt\(bulkCategory\);/,
  "if (bulkCategoryIds.length > 0) updates.categoryIds = bulkCategoryIds;"
);

// Replace the <select> with a generic multi-checkbox or a pill selector
const newSelectUI = `
            <div className="flex flex-col relative group">
              <button type="button" className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none min-w-[200px] text-left flex justify-between items-center">
                <span>{bulkCategoryIds.length > 0 ? \`\${bulkCategoryIds.length} categories selected\` : '-- Assign Categories --'}</span>
              </button>
              <div className="absolute top-full left-0 mt-1 w-[300px] max-h-[300px] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl hidden group-hover:block z-50 p-2">
                {categoriesData.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={bulkCategoryIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setBulkCategoryIds([...bulkCategoryIds, c.id]);
                        else setBulkCategoryIds(bulkCategoryIds.filter(id => id !== c.id));
                      }}
                      className="rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-200">{c.name}</span>
                  </label>
                ))}
                <button 
                  onClick={() => setBulkCategoryIds([])}
                  className="w-full text-left p-1.5 mt-1 text-xs text-slate-400 hover:text-slate-200 border-t border-slate-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
`;

code = code.replace(
  /<select[\s\S]*?<\/select>/,
  newSelectUI
);

code = code.replace(
  /disabled=\{!bulkCategory \|\| bulkUpdateMutation\.isPending\}/,
  "disabled={bulkCategoryIds.length === 0 || bulkUpdateMutation.isPending}"
);

code = code.replace(
  /setBulkCategory\(""\);/,
  "setBulkCategoryIds([]);"
);

// Display multiple categories in the table
const displayCat = `
                <td className="p-4 text-sm text-slate-300">
                  {p.categoryIds && p.categoryIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.categoryIds.map((cid: number) => {
                        const c = categoriesData.find((cat: any) => cat.id === cid);
                        return c ? <span key={cid} className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">{c.name}</span> : null;
                      })}
                    </div>
                  ) : p.categoryId ? categoriesData.find((c: any) => c.id === p.categoryId)?.name || 'Unknown' : <span className="text-slate-500 italic">None</span>}
                </td>
`;

code = code.replace(
  /<td className="p-4 text-sm text-slate-300">[\s\S]*?<\/td>/,
  displayCat
);

fs.writeFileSync('src/components/AdminListings.tsx', code);
console.log("Patched AdminListings.tsx");
