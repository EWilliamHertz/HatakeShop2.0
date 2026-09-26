const fs = require('fs');

let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Add import
if (!code.includes('import { Globe }')) {
  code = code.replace(
    "import { QuickSearchResults } from '../components/QuickSearchResults.tsx';",
    "import { QuickSearchResults } from '../components/QuickSearchResults.tsx';\nimport { Globe } from '../components/Globe.tsx';"
  );
}

// Replace Bento Card 2
const bentoCard2Pattern = /\{\/\* Bento Card 2: Mission \*\/\}[\s\S]*?<div className="bg-slate-950\/50 border border-white\/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newBentoCard2 = `{/* Bento Card 2: Global Trade Flow Globe */}
            <div className="relative group rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-0 overflow-hidden hover:border-white/10 transition-all duration-500 flex flex-col justify-center items-center h-full min-h-[300px]">
               <div className="absolute top-4 left-6 z-20">
                 <h3 className="text-xl font-bold text-white leading-tight">{t('Global Trade Flow')}</h3>
                 <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span> Live B2B Activity</p>
               </div>
               <div className="absolute inset-0 z-10 opacity-70 pointer-events-none mix-blend-screen bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
               <div className="w-[150%] h-[150%] absolute top-10 flex items-center justify-center translate-y-12">
                 <Globe />
               </div>
            </div>`;

if (code.includes('Bento Card 2: Mission')) {
  code = code.replace(bentoCard2Pattern, newBentoCard2);
  fs.writeFileSync('src/pages/Home.tsx', code);
}
