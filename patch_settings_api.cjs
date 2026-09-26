const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

if (!code.includes("Developer API")) {
  // 1. Add Code icon to lucide-react imports
  code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, Code} from 'lucide-react';");

  // 2. Add Developer API to tabs
  code = code.replace(
    "{ id: 'referral', name: 'Partner Referral Program', icon: Users },",
    "{ id: 'referral', name: 'Partner Referral Program', icon: Users },\n    { id: 'api', name: 'Developer API', icon: Code },"
  );

  // 3. Add Developer API Tab content
  const apiTab = `
        {activeTab === 'api' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-white mb-2 flex items-center"><Code className="w-5 h-5 mr-2 text-indigo-400" /> Developer API & Inventory Sync</h2>
            <p className="text-slate-400 text-sm">Use your secure API key to automatically sync Hatake.Shop wholesale inventory directly into your Shopify or Point-of-Sale (POS) systems.</p>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Your Secret API Key</h3>
              <div className="flex gap-2">
                 <input type="text" readOnly value="hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6" className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 text-indigo-300 font-mono text-sm rounded-xl outline-none" />
                 <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors">Copy</button>
                 <button className="px-4 py-2 bg-slate-800 hover:bg-rose-900/30 text-rose-400 text-sm font-semibold rounded-xl transition-colors">Revoke</button>
              </div>
              <p className="text-xs text-rose-400 mt-2">Do not share this key. It grants read access to your allocated pricing and global inventory.</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
               <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Integration Example (Node.js)</h3>
               <div className="bg-[#0d1117] border border-white/5 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-300 font-mono leading-relaxed">
<span className="text-pink-400">const</span> fetch = require(<span className="text-green-300">'node-fetch'</span>);

<span className="text-slate-500">// Fetch Live Inventory</span>
<span className="text-pink-400">const</span> response = <span className="text-pink-400">await</span> fetch(<span className="text-green-300">'https://api.hatake.shop/v2/inventory'</span>, {
  <span className="text-cyan-300">headers</span>: {
    <span className="text-green-300">'Authorization'</span>: <span className="text-green-300">'Bearer hk_prod_9f8c2e1...'</span>
  }
});

<span className="text-pink-400">const</span> inventory = <span className="text-pink-400">await</span> response.json();
console.log(<span className="text-green-300">"Synced items:"</span>, inventory.length);
                  </pre>
               </div>
            </div>
          </div>
        )}
  `;

  code = code.replace(
    "{activeTab === 'referral' && (",
    apiTab + "\n        {activeTab === 'referral' && ("
  );

  fs.writeFileSync('src/pages/Settings.tsx', code);
}
