const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Find the start of Bento Card 2
const startMarker = "{/* Bento Card 2: Mission */}";
const startIndex = code.indexOf(startMarker);

if (startIndex !== -1) {
  // Try to find the end of it (it's exactly followed by Bento Card 3)
  const endMarker = "{/* Bento Card 3: Categories */}";
  const endIndex = code.indexOf(endMarker);
  
  if (endIndex !== -1) {
     const newBentoCard2 = `{/* Bento Card 2: Global Trade Flow Globe */}
            <div className="relative group rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-0 overflow-hidden hover:border-white/10 transition-all duration-500 flex flex-col justify-center items-center h-full min-h-[300px]">
               <div className="absolute top-6 left-6 z-20">
                 <h3 className="text-xl font-bold text-white leading-tight">{t('Global Trade Flow')}</h3>
                 <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span> Live B2B Activity</p>
               </div>
               <div className="absolute inset-0 z-10 opacity-70 pointer-events-none mix-blend-screen bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
               <div className="w-[150%] h-[150%] absolute top-0 flex items-center justify-center translate-y-12">
                 <Globe />
               </div>
            </div>
            
            `;
            
     code = code.substring(0, startIndex) + newBentoCard2 + code.substring(endIndex);
     fs.writeFileSync('src/pages/Home.tsx', code);
     console.log("Successfully replaced Bento Card 2");
  } else {
     console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
