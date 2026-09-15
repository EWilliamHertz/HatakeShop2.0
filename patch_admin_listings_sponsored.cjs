const fs = require('fs');
let code = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');

// Add a state for sponsored toggle
code = code.replace(
  /const \[bulkCategoryIds, setBulkCategoryIds\] = useState<number\[\]>\(\[\]\);/,
  "const [bulkCategoryIds, setBulkCategoryIds] = useState<number[]>([]);\n  const [bulkSponsored, setBulkSponsored] = useState<string>('');"
);

// Include it in the updates
code = code.replace(
  /if \(bulkCategoryIds\.length > 0\) updates\.categoryIds = bulkCategoryIds;/,
  "if (bulkCategoryIds.length > 0) updates.categoryIds = bulkCategoryIds;\n    if (bulkSponsored !== '') updates.isSponsored = bulkSponsored === 'true';"
);

// Reset it on success
code = code.replace(
  /setBulkCategoryIds\(\[\]\);/,
  "setBulkCategoryIds([]);\n      setBulkSponsored('');"
);

// Add the dropdown in the UI next to the category selector
code = code.replace(
  /<button \n              onClick=\{handleBulkUpdate\}/,
  `<select 
              value={bulkSponsored} 
              onChange={e => setBulkSponsored(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="">-- Set Sponsored --</option>
              <option value="true">Mark as Sponsored</option>
              <option value="false">Remove Sponsored</option>
            </select>
            <button 
              onClick={handleBulkUpdate}`
);

// Update the disabled condition
code = code.replace(
  /disabled=\{bulkCategoryIds\.length === 0 \|\| bulkUpdateMutation\.isPending\}/,
  "disabled={(bulkCategoryIds.length === 0 && bulkSponsored === '') || bulkUpdateMutation.isPending}"
);

// Show if a product is sponsored in the table
code = code.replace(
  /\{p\.title\}<\/div>/,
  "{p.title} {p.isSponsored && <span className=\"ml-2 bg-[#ffcc00] text-black px-1.5 py-0.5 rounded text-[10px] font-bold\">SPONSORED</span>}</div>"
);

fs.writeFileSync('src/components/AdminListings.tsx', code);
console.log("Patched AdminListings with Sponsored toggle");
