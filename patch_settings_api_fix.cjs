const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const apiTabContent = `
            {activeTab === 'api' ? (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div>
                    <h3 className="text-3xl font-black tracking-tighter text-white mb-2 flex items-center gap-3">
                       <Code className="w-8 h-8 text-cyan-400" />
                       Developer API
                       <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-widest border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">v2.0 Beta</span>
                    </h3>
                    <p className="text-slate-400 text-base max-w-2xl">Use your secure API key to automatically sync Hatake.Shop's live wholesale inventory directly into your Shopify, WooCommerce, or custom ERP systems.</p>
                 </div>
                 
                 <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
                       <div className="absolute top-0 right-0 p-32 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                       
                       <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                          Production API Key
                       </h4>
                       <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 relative">
                             <input type="text" readOnly value="hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6" className="w-full pl-4 pr-12 py-3.5 bg-black/50 border border-white/10 text-cyan-300 font-mono text-sm rounded-xl outline-none focus:border-cyan-500/50 transition-colors shadow-inner selection:bg-cyan-500/30" />
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText('hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6'); alert('Copied API Key to clipboard!'); }} className="px-6 py-3.5 bg-white text-black hover:bg-slate-200 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] whitespace-nowrap">
                             Copy Key
                          </button>
                          <button className="px-6 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl transition-all border border-rose-500/20 hover:border-rose-500/50 whitespace-nowrap">
                             Revoke
                          </button>
                       </div>
                       <p className="text-xs text-slate-500 mt-4 max-w-xl leading-relaxed">
                          <strong className="text-rose-400 font-semibold">Security Warning:</strong> Treat this key like a password. It grants read-only access to your negotiated pricing tiers and global inventory allocations. Do not expose it in client-side code.
                       </p>
                    </div>
                 </div>
                 
                 <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                       </div>
                       <div className="text-xs font-mono text-slate-500 tracking-wider">Node.js Integration Example</div>
                    </div>
                    <div className="p-6 overflow-x-auto">
                       <pre className="text-sm font-mono leading-relaxed">
<span className="text-purple-400">import</span> fetch <span className="text-purple-400">from</span> <span className="text-emerald-300">'node-fetch'</span>;

<span className="text-slate-500 italic">// Initialize client connection to Hatake API</span>
<span className="text-purple-400">const</span> syncInventory = <span className="text-purple-400">async</span> () <span className="text-cyan-400">=></span> {
  <span className="text-purple-400">try</span> {
    <span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> fetch(<span className="text-emerald-300">'https://api.hatake.shop/v2/inventory/sync'</span>, {
      <span className="text-cyan-300">headers</span>: {
        <span className="text-emerald-300">'Authorization'</span>: <span className="text-emerald-300">'Bearer hk_prod_9f8c2e1...'</span>,
        <span className="text-emerald-300">'Content-Type'</span>: <span className="text-emerald-300">'application/json'</span>
      }
    });

    <span className="text-purple-400">const</span> { data } = <span className="text-purple-400">await</span> response.json();
    console.log(<span className="text-emerald-300">\`Successfully synced \${data.length} products\`</span>);
    
    <span className="text-slate-500 italic">// Push to Shopify/ERP...</span>
    <span className="text-purple-400">await</span> shopifyClient.bulkUpdate(data);
    
  } <span className="text-purple-400">catch</span> (error) {
    console.error(<span className="text-emerald-300">'Sync failed:'</span>, error);
  }
};
                       </pre>
                    </div>
                 </div>
               </div>
            ) : activeTab === 'referral' ? (`

code = code.replace(
  "{activeTab === 'referral' ? (",
  apiTabContent
);

// If Developer API tab button is not in the array, add it.
if (!code.includes("'api'")) {
  code = code.replace(
    "{ id: 'referral', name: 'Partner Referral Program', icon: Users },",
    "{ id: 'referral', name: 'Partner Referral Program', icon: Users },\n    { id: 'api', name: 'Developer API', icon: Code },"
  );
  code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, Code} from 'lucide-react';");
}

fs.writeFileSync('src/pages/Settings.tsx', code);
