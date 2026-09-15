const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldFilter = `                      {(stats?.recentUsers || [])
                        .filter((u: any) => 
                          (u.companyName || '').toLowerCase().includes(companySearch.toLowerCase()) || 
                          u.id.toString().includes(companySearch) ||
                          (u.displayName || '').toLowerCase().includes(companySearch.toLowerCase())
                        )`;

const newFilter = `                      {(stats?.recentUsers || [])
                        .filter((u: any) => 
                          ((u.companyName || '').toLowerCase().includes(companySearch.toLowerCase()) || 
                          u.id.toString().includes(companySearch) ||
                          (u.displayName || '').toLowerCase().includes(companySearch.toLowerCase())) &&
                          !u.teamOwnerId // ONLY show parent companies, not team members
                        )`;

if(content.includes(oldFilter)) {
   content = content.replace(oldFilter, newFilter);
   fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
   console.log("Patched successfully");
} else {
   console.log("Could not find old filter");
}
