const fs = require('fs');

let code = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');

// 1. Fix the API fetch and background images logic
const oldQuery = `  const { data: homeProductsData } = useQuery({ 
    queryKey: ['homeProducts'], 
    queryFn: async () => {
      const res = await fetch('/api-v2/home-products');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const backgroundImages = useMemo(() => {
    const imgs = new Set<string>();
    const source = homeProductsData?.featured || [];`;

const newQuery = `  const { data: homeProductsData } = useQuery({ 
    queryKey: ['onboardingProducts'], 
    queryFn: async () => {
      const res = await fetch('/api-v2/products?sortBy=recommended');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const backgroundImages = useMemo(() => {
    const imgs = new Set<string>();
    const source = homeProductsData?.products || [];`;

code = code.replace(oldQuery, newQuery);


// 2. Replace the slot machine with the rainbow wheel
const oldCasino = `      {/* Casino Slot Machine Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden flex gap-4 rotate-[-12deg] scale-125 translate-y-[-10%]">
        {[...Array(5)].map((_, colIdx) => {
          let colItems = [...MOCK_PRODUCTS];
          if (backgroundImages.length > 0) {
             let pool = [...backgroundImages];
             while (pool.length < 25) {
                pool = [...pool, ...[...backgroundImages].sort(() => Math.random() - 0.5)];
             }
             const colSize = Math.max(5, Math.ceil(pool.length / 5));
             const start = colIdx * colSize;
             colItems = pool.slice(start, start + colSize);
          }
          const displayItems = [...colItems, ...colItems, ...colItems];
          
          return (
          <motion.div
            key={colIdx}
            className="flex flex-col gap-4 min-w-[200px]"
            animate={{ y: [0, -1500] }}
            transition={{ repeat: Infinity, duration: 30 + (colIdx % 3) * 10, ease: "linear", repeatType: "loop" }}
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
        )})}
      </div>`;


const newCasino = `      {/* Rainbow Flowing Product Cycle */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none overflow-hidden flex items-center justify-center">
        <motion.div 
          className="absolute w-[240vh] h-[240vh] rounded-full"
          style={{ top: '20vh' }}
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 100, ease: "linear" }}
        >
          {backgroundImages.map((item, i) => {
             const angle = (i * (360 / backgroundImages.length));
             return (
               <div 
                 key={i} 
                 className="absolute left-1/2 top-1/2 -ml-[10vh] -mt-[14vh] w-[20vh] h-[28vh]"
                 style={{
                   transform: \`rotate(\${angle}deg) translateY(-120vh)\`
                 }}
               >
                  <div className="w-full h-full bg-slate-900 border-2 border-slate-700/50 rounded-2xl p-2 shadow-2xl">
                    <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-800">
                      <img src={item} alt="" className="w-full h-full object-cover opacity-100 saturate-[1.3] shadow-2xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                    </div>
                  </div>
               </div>
             );
          })}
        </motion.div>
      </div>`;

code = code.replace(oldCasino, newCasino);
fs.writeFileSync('src/pages/Onboarding.tsx', code);
