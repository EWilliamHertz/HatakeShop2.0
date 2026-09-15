const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldHandleUpdate = `await fetch(\`/api-v2/admin/users/\${editingUser.id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ 
          role: editingUser.role, 
          verificationStatus: editingUser.verificationStatus,
          companyName: editingUser.companyName,
          teamOwnerId: editingUser.teamOwnerId,
          email: editingUser.email,
          displayName: editingUser.displayName
        })
      });`;

const newHandleUpdate = `await fetch(\`/api-v2/admin/users/\${editingUser.id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ 
          role: editingUser.role, 
          verificationStatus: editingUser.verificationStatus,
          companyName: editingUser.companyName,
          teamOwnerId: editingUser.teamOwnerId,
          email: editingUser.email,
          displayName: editingUser.displayName,
          orgNumber: editingUser.orgNumber,
          website: editingUser.website,
          aboutUs: editingUser.aboutUs,
          country: editingUser.country,
          region: editingUser.region,
          companyFocus: editingUser.companyFocus,
          vatNumber: editingUser.vatNumber,
          profilePictureUrl: editingUser.profilePictureUrl,
          bannerUrl: editingUser.bannerUrl
        })
      });`;

const oldModalJSX = `              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={editingUser.companyName || ''} 
                  onChange={e => setEditingUser({...editingUser, companyName: e.target.value})} 
                  className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" 
                  placeholder="Leave blank if team member"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Select Company (Join Team)</label>`;

const newModalJSX = `              <div className="pt-4 mt-2 border-t border-slate-700">
                <h4 className="text-md font-bold text-white mb-3">Company Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Company Name</label>
                    <input type="text" value={editingUser.companyName || ''} onChange={e => setEditingUser({...editingUser, companyName: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" placeholder="Leave blank if team member"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Org Number</label>
                    <input type="text" value={editingUser.orgNumber || ''} onChange={e => setEditingUser({...editingUser, orgNumber: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">VAT Number</label>
                    <input type="text" value={editingUser.vatNumber || ''} onChange={e => setEditingUser({...editingUser, vatNumber: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Country</label>
                    <input type="text" value={editingUser.country || ''} onChange={e => setEditingUser({...editingUser, country: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" placeholder="e.g. Sweden" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Region</label>
                    <input type="text" value={editingUser.region || ''} onChange={e => setEditingUser({...editingUser, region: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" placeholder="e.g. Europe" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Company Focus</label>
                    <input type="text" value={editingUser.companyFocus || ''} onChange={e => setEditingUser({...editingUser, companyFocus: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" placeholder="e.g. TCG Distributor" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Website</label>
                    <input type="text" value={editingUser.website || ''} onChange={e => setEditingUser({...editingUser, website: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Profile Pic URL</label>
                    <input type="text" value={editingUser.profilePictureUrl || ''} onChange={e => setEditingUser({...editingUser, profilePictureUrl: e.target.value})} className="w-full px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-ink outline-none" />
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-700">
                <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Select Company (Join Team)</label>`;

if (content.includes(oldHandleUpdate)) {
  content = content.replace(oldHandleUpdate, newHandleUpdate);
  content = content.replace(oldModalJSX, newModalJSX);
  fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
  console.log("Patched AdminDashboard successfully");
} else {
  console.log("Could not find blocks");
}
