const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf8');

const hagglerUI = `
          {/* AI Auto-Haggler Card (Seller Only) */}
          {dbUser?.id === inquiry.product?.sellerId && inquiry.inquiry.status === 'Pending' && (
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 mt-6 relative overflow-hidden group">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors pointer-events-none"></div>
               <div className="flex items-center justify-between mb-4 relative">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                     </div>
                     <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">AI Auto-Haggler <span className="text-[9px] uppercase bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">BETA</span></h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" id="hagglerToggle" />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
               </div>
               
               <p className="text-xs text-slate-400 mb-4 relative leading-relaxed">
                  Let Hatake's AI negotiate with this buyer while you sleep. Set your absolute minimum price, and the agent will haggle to secure the highest possible margin.
               </p>
               
               <div className="space-y-3 relative">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Your Floor Price (Minimum)</label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">€</span>
                       <input type="number" defaultValue={(inquiry.product?.unitCost * 0.9).toFixed(2)} className="w-full bg-[#0a0a0a] border border-slate-700 focus:border-indigo-500 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono outline-none transition-colors" />
                    </div>
                  </div>
                  <button onClick={() => {
                     const toggle = document.getElementById('hagglerToggle') as HTMLInputElement;
                     if(toggle && !toggle.checked) toggle.checked = true;
                     toast.success("AI Auto-Haggler activated for this Deal Room.");
                     
                     // Simulate AI sending a message
                     setTimeout(() => {
                       const messageText = \`[AI Auto-Haggler Initiated] Hello! I am the automated sales agent for \${inquiry.seller?.companyName || 'this supplier'}. I see your target budget is €\${inquiry.inquiry.targetBudget}. We'd love to make a deal. If you can increase your quantity by 10%, I can offer you a special bundled discount. How does that sound?\`;
                       fetch(\`/api-v2/inquiries/\${inquiry.inquiry.id}/messages\`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test' },
                          body: JSON.stringify({ text: messageText, type: 'text' })
                       });
                     }, 1500);
                  }} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                     Activate AI Agent
                  </button>
               </div>
            </div>
          )}
`;

const insertionTarget = "            </div>\n          </div>\n        </div>\n        \n        <div className=\"lg:col-span-2";

if (!code.includes('AI Auto-Haggler Card')) {
  code = code.replace(
    insertionTarget,
    `              {inquiry.inquiry.isBlindDropship && (
                <div className="col-span-2 mt-4 p-4 bg-amber-950/30 rounded-xl border border-amber-900/50">
                  <div className="flex items-center text-amber-500 font-semibold mb-3 text-sm">
                    <EyeOff className="w-4 h-4 mr-2 text-amber-400" />
                    Blind Dropshipping Required
                  </div>
                  <div className="text-sm text-amber-200/80 space-y-2">
                    <p className="font-medium flex items-center text-amber-200"><Package className="w-4 h-4 mr-2"/> {t('Ships directly to end-consumer')}</p>
                    <p className="opacity-80 text-xs">{t('Do NOT include Hatake or supplier branding on packing slips.')}</p>
                    <div className="mt-3 pt-3 border-t border-amber-900/50 space-y-1.5">
                      <div><span className="font-medium text-amber-400">{t('Consumer Name:')}</span> {inquiry.inquiry.dropshipConsumerName}</div>
                      <div><span className="font-medium text-amber-400">{t('Shipping Address:')}</span> {inquiry.inquiry.dropshipConsumerAddress}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
${hagglerUI}
        </div>
        
        <div className="lg:col-span-2`
  );
  
  // Need to use regex or split just in case
}
fs.writeFileSync('src/pages/RFQDetails.tsx', code);
