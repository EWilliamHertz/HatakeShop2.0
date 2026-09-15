const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// For assigning teamOwnerId:
const oldTeam = `{(stats?.recentUsers || []).filter(u => u.companyName && u.id !== editingUser.id).map(u => (`;
const newTeam = `{(stats?.recentUsers || []).filter(u => u.companyName && !u.teamOwnerId && u.id !== editingUser.id).map(u => (`;
content = content.replace(oldTeam, newTeam);

// For editing product sellerId:
const oldProductSeller = `                  {(stats?.recentUsers || []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.companyName || u.email} ({u.email})</option>
                  ))}`;
const newProductSeller = `                  {(stats?.recentUsers || []).filter(u => !u.teamOwnerId).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.companyName || u.email} ({u.email})</option>
                  ))}`;
content = content.replace(oldProductSeller, newProductSeller);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
