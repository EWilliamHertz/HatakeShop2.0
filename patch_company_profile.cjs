const fs = require('fs');
let profile = fs.readFileSync('src/pages/CompanyProfile.tsx', 'utf-8');

const target = `{teamMembers.map((member: any) => (
                  <li key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center font-semibold text-sm">
                      {member.displayName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold tracking-tight text-slate-100">{member.displayName || 'Unknown Member'}</div>
                      <div className="text-xs text-slate-400">{member.teamRole === 'owner' ? 'Administrator' : member.teamRole === 'sales_rep' ? 'Sales Representative' : 'Catalog Manager'}</div>
                    </div>
                  </li>
                ))}`;

const replacement = `{teamMembers.map((member: any) => (
                  <li key={member.id}>
                    <Link to={\`/user/\${member.id}\`} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded-xl transition-colors">
                      {member.profilePictureUrl ? (
                        <img src={member.profilePictureUrl} alt={member.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center font-semibold text-sm border border-slate-800">
                          {member.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-semibold tracking-tight text-slate-100">{member.displayName || 'Unknown Member'}</div>
                        <div className="text-xs text-slate-400">{member.teamRole === 'owner' ? 'Administrator' : member.teamRole === 'sales_rep' ? 'Sales Representative' : 'Catalog Manager'}</div>
                      </div>
                    </Link>
                  </li>
                ))}`;

profile = profile.replace(target, replacement);
fs.writeFileSync('src/pages/CompanyProfile.tsx', profile);
console.log("Patched CompanyProfile.tsx");
