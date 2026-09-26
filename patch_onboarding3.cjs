const fs = require('fs');
let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

const oldRoll = `        {[...Array(5)].map((_, colIdx) => (
          <motion.div
            key={colIdx}
            className="flex flex-col gap-4 min-w-[200px]"
            animate={{
              y: [0, -1000]
            }}
            transition={{
              repeat: Infinity,
              duration: 20 + (colIdx % 3) * 5,
              ease: "linear",
              repeatType: "loop"
            }}
          >
            {(backgroundImages.length > 0 
              ? [...backgroundImages, ...backgroundImages, ...backgroundImages, ...backgroundImages].slice(0, 15)
              : [...MOCK_PRODUCTS, ...MOCK_PRODUCTS, ...MOCK_PRODUCTS]).map((item, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl">
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-slate-800 relative">
                  {typeof item === 'string' ? (
                    <img src={item} alt="" className="w-full h-full object-cover grayscale opacity-50 mix-blend-screen" />
                  ) : (
                    <div className={\`w-full h-full \${item.bg} flex items-center justify-center opacity-60\`}>
                      <span className="text-white/80 font-black text-2xl rotate-[-45deg] whitespace-nowrap tracking-wider drop-shadow-md">{item.type}</span>
                    </div>
                  )}
                  {typeof item === 'string' && <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>}
                </div>
                <div className="h-2 bg-slate-800 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}
          </motion.div>
        ))}`;

const newRoll = `        {[...Array(5)].map((_, colIdx) => {
          let colItems = [...MOCK_PRODUCTS];
          if (backgroundImages.length > 0) {
             const colSize = Math.max(5, Math.ceil(backgroundImages.length / 5));
             const start = colIdx * colSize;
             colItems = backgroundImages.slice(start, start + colSize);
             if (colItems.length === 0) colItems = backgroundImages.slice(0, colSize);
          }
          // Duplicate items to create a seamless infinite scroll loop
          const displayItems = [...colItems, ...colItems, ...colItems];
          
          return (
          <motion.div
            key={colIdx}
            className="flex flex-col gap-4 min-w-[200px]"
            animate={{
              y: [0, -1500]
            }}
            transition={{
              repeat: Infinity,
              duration: 30 + (colIdx % 3) * 10,
              ease: "linear",
              repeatType: "loop"
            }}
          >
            {displayItems.map((item, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl">
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-slate-800 relative">
                  {typeof item === 'string' ? (
                    <img src={item} alt="" className="w-full h-full object-cover opacity-90 drop-shadow-lg saturate-[1.2] hover:scale-105 transition-transform" />
                  ) : (
                    <div className={\`w-full h-full \${item.bg} flex items-center justify-center opacity-90 saturate-[1.2]\`}>
                      <span className="text-white font-black text-2xl rotate-[-45deg] whitespace-nowrap tracking-wider drop-shadow-xl">{item.type}</span>
                    </div>
                  )}
                  {typeof item === 'string' && <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none"></div>}
                </div>
                <div className="h-2 bg-slate-800 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
              </div>
            ))}
          </motion.div>
        )})}`;

code = code.replace(oldRoll, newRoll);

// Now patch the logo
const oldLogo = `<div className="flex justify-center opacity-30 mt-4">
              <img src="/logo.png" alt="Hatake" className="h-8 w-auto grayscale mix-blend-screen opacity-70" />
            </div>`;

const newLogo = `<div className="flex justify-center mt-6 relative z-50">
              <img src="/logo.png" alt="Hatake" className="h-16 w-auto drop-shadow-2xl hover:scale-105 transition-transform" />
            </div>`;

code = code.replace(oldLogo, newLogo);

fs.writeFileSync('src/pages/Onboarding.tsx', code);
