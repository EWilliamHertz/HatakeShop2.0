const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldTd = `<td className="px-4 py-3">
                       <div className="font-semibold tracking-tight text-slate-100">{u.companyName || '--'}</div>
                       {u.teamOwnerId && <div className="text-xs text-[#ffcc00] font-semibold tracking-tight bg-slate-700 px-2 py-0.5 rounded inline-block mt-1">Team Member</div>}
                    </td>`;

const newTd = `<td className="px-4 py-3">
                       <div className="font-semibold tracking-tight text-slate-100">
                         {u.companyName ? (
                           <Link to={\`/company/\${u.id}\`} className="hover:text-cyan-400 hover:underline">{u.companyName}</Link>
                         ) : '--'}
                       </div>
                       {u.teamOwnerId && <div className="text-xs text-[#ffcc00] font-semibold tracking-tight bg-slate-700 px-2 py-0.5 rounded inline-block mt-1">Team Member</div>}
                    </td>`;

content = content.replace(oldTd, newTd);
fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
