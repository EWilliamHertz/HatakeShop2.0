const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// 1. Add states for search and dropdown
const statesToAdd = `
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
`;
content = content.replace("const [reviewForm, setReviewForm] = useState", statesToAdd + "\n const [reviewForm, setReviewForm] = useState");

// 2. Replace the Target User ID (Seller) input with the searchable dropdown
const oldInput = `<div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Target User ID (Seller)</label>
                <input type="number" value={reviewForm.targetUserId} onChange={e => setReviewForm({...reviewForm, targetUserId: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full px-4 py-2" placeholder="Leave blank if product review" />
              </div>`;

const newInput = `<div className="relative">
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Target Company (Seller)</label>
                <div 
                  className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2 cursor-pointer flex justify-between items-center"
                  onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                >
                  <span className={reviewForm.targetUserId ? "text-slate-100" : "text-slate-400"}>
                    {reviewForm.targetUserId 
                      ? (stats?.recentUsers?.find((u: any) => u.id === parseInt(reviewForm.targetUserId))?.companyName || \`User ID: \${reviewForm.targetUserId}\`) 
                      : "Select a Company..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                
                {showCompanyDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg">
                    <div className="p-2 border-b border-slate-700">
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Search company or ID..." 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                        value={companySearch}
                        onChange={e => setCompanySearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div 
                         className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-sm text-slate-400"
                         onClick={() => {
                           setReviewForm({...reviewForm, targetUserId: ''});
                           setShowCompanyDropdown(false);
                         }}
                      >
                        -- Clear Selection --
                      </div>
                      {(stats?.recentUsers || [])
                        .filter((u: any) => 
                          (u.companyName || '').toLowerCase().includes(companySearch.toLowerCase()) || 
                          u.id.toString().includes(companySearch) ||
                          (u.displayName || '').toLowerCase().includes(companySearch.toLowerCase())
                        )
                        .map((u: any) => (
                          <div 
                            key={u.id} 
                            className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-sm border-t border-slate-700/50"
                            onClick={() => {
                              setReviewForm({...reviewForm, targetUserId: u.id.toString()});
                              setShowCompanyDropdown(false);
                              setCompanySearch('');
                            }}
                          >
                            <div className="font-semibold text-slate-200">{u.companyName || u.displayName || 'No Name'}</div>
                            <div className="text-xs text-slate-400">ID: {u.id} &middot; Role: {u.role}</div>
                          </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>`;

content = content.replace(oldInput, newInput);
fs.writeFileSync('src/pages/AdminDashboard.tsx', content);

