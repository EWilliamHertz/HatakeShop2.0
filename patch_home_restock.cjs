const fs = require('fs');

let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const restockUI = `
      {/* AI Restock Intelligence */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 relative z-10">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
            </div>
            <div>
               <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  AI Restock Intelligence <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30">Beta</span>
               </h3>
               <p className="text-slate-400 text-sm">Based on your sales velocity, these items are likely running low.</p>
            </div>
         </div>
         
         <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {[1, 2, 3, 4].map(i => (
               <div key={i} className="min-w-[280px] sm:min-w-[320px] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 snap-start hover:border-indigo-500/30 hover:bg-slate-800/80 transition-colors group cursor-pointer" onClick={() => navigate('/marketplace')}>
                  <div className="flex items-start gap-4">
                     <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                        <img src="https://images.unsplash.com/photo-1615592389070-bcc97e05ad01?auto=format&fit=crop&w=150&q=80" alt="Pokemon" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                     </div>
                     <div>
                        <h4 className="text-sm font-semibold text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">Pokémon TCG: Scarlet & Violet Booster Box</h4>
                        <p className="text-xs text-emerald-400 mt-1 font-medium">Restock Recommended</p>
                     </div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                     <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Predicted Need</p>
                        <p className="text-sm font-bold text-slate-300">12 Units</p>
                     </div>
                     <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                        Source Now
                     </button>
                  </div>
               </div>
            ))}
         </div>
      </div>
`;

if (!code.includes('AI Restock Intelligence')) {
  // Find a good place to insert it. Right after the hero section.
  code = code.replace(
    '{/* -------------------------------------------',
    restockUI + '\n      {/* -------------------------------------------'
  );
}

fs.writeFileSync('src/pages/Home.tsx', code);
