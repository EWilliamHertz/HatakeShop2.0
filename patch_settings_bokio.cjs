const fs = require('fs');

let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const bokioCard = `
                 {/* Accounting Integration Card */}
                 <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
                    
                    <div className="flex items-start gap-4 mb-6 relative">
                       <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white mb-1 tracking-tight flex items-center gap-2">Accounting Auto-Sync <span className="text-[10px] uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">BETA</span></h3>
                          <p className="text-slate-400 text-sm max-w-2xl">Automatically push paid invoices, platform fees, and tax calculations to Bokio, Xero, or QuickBooks as journal entries.</p>
                       </div>
                    </div>

                    <div className="space-y-5 relative">
                       <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                          <div>
                            <h4 className="text-white font-medium">Bokio Integration</h4>
                            <p className="text-xs text-slate-500">Sync Hatake checkout events to Bokio</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                       </div>

                       <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300 ml-1">Bokio Webhook / API Key</label>
                          <div className="flex relative">
                             <input 
                               type="password" 
                               defaultValue="bk_prod_8x9y0z1a2b3c4d5e"
                               className="w-full bg-[#0a0a0a] border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-mono text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
                             />
                             <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                                Verify Connection
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
`;

if (!code.includes('Accounting Auto-Sync')) {
  // Insert it right after the existing API key card
  code = code.replace(
    '</p>\n                 </div>                 <div className="flex justify-end mb-4 mt-6">',
    '</p>\n                 </div>                 <div className="flex justify-end mb-4 mt-6">'
  );
  
  // Actually let's just place it before the final closing div of the 'api' tab content
  const target = '                 <div className="flex justify-end mb-4 mt-6">';
  code = code.replace(target, bokioCard + '\n' + target);
  
  fs.writeFileSync('src/pages/Settings.tsx', code);
}
