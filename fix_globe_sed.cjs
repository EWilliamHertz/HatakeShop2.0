const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const target = `            {/* Bento Card 2: Mission */}
            <div className="relative group rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 overflow-hidden hover:border-white/10 transition-all duration-500 flex flex-col justify-between">
               <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
               <div className="relative z-10 space-y-6">
                 <div className="p-3 bg-cyan-500/20 rounded-2xl w-fit border border-cyan-500/30">
                   <Package className="w-6 h-6 text-cyan-400" />
                 </div>
                 <div>
                   <h3 className="text-2xl font-bold text-white mb-3 leading-tight">{t('Empowering Global B2B Trade')}</h3>
                   <p className="text-slate-400 text-sm leading-relaxed">
                     {t('Source multi-tonne shipments for custom white-label manufacturing, or procure established, ready-to-ship brands at wholesale prices. Hatake bridges the gap.')}
                   </p>
                 </div>
               </div>
               
               <div className="relative z-10 mt-8 grid grid-cols-2 gap-3">
                 <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-bold text-white">OEM</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Tonnes</span>
                 </div>
                 <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-bold text-white">Retail</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Stock</span>
                 </div>
               </div>
            </div>`;

const newBentoCard2 = `            {/* Bento Card 2: Global Trade Flow Globe */}
            <div className="relative group rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-0 overflow-hidden hover:border-white/10 transition-all duration-500 flex flex-col justify-center items-center h-full min-h-[300px]">
               <div className="absolute top-6 left-6 z-20">
                 <h3 className="text-xl font-bold text-white leading-tight">{t('Global Trade Flow')}</h3>
                 <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span> Live B2B Activity</p>
               </div>
               <div className="absolute inset-0 z-10 opacity-70 pointer-events-none mix-blend-screen bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
               <div className="w-[150%] h-[150%] absolute top-0 flex items-center justify-center translate-y-12">
                 <Globe />
               </div>
            </div>`;

code = code.replace(target, newBentoCard2);
fs.writeFileSync('src/pages/Home.tsx', code);
