import re

with open('src/pages/Home.tsx', 'r') as f:
    content = f.read()

# We want to replace everything from:
# <div className="relative overflow-hidden bg-slate-900 text-white border-b border-slate-800 shadow-sm">
# down to the end of that container:
#       </div>
#
#       
#       <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-12 space-y-12 flex-1">

new_hero = """
      <div className="relative overflow-hidden bg-[#020617] text-white border-b border-white/5">
        {/* Massive Ambient Glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
        
        {/* Mesh Grid overlay for texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>

        <div className="relative pt-24 pb-16 md:pt-36 md:pb-28 px-4 max-w-6xl mx-auto flex flex-col items-center z-10">
          
          {/* Version Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 hover:bg-white/10 transition-all cursor-default shadow-[0_0_15px_rgba(255,255,255,0.05)]">
             <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
             <span className="text-sm font-semibold tracking-wide text-slate-300">Hatake 2.0 Launch Network</span>
             <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold text-white ml-2">{leadsProgress.sentCount.toLocaleString()} Invites Sent</span>
          </div>

          {/* Epic Typography */}
          <div className="text-center space-y-8 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 drop-shadow-sm">
              {t('Next-Generation')} <br/>
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">{t('B2B TCG Sourcing')}</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
              {t('Discover verified suppliers, negotiate MOQ deals, and source directly from top manufacturers globally.')}
            </p>
          </div>

          {/* Command Palette Search */}
          <div className="w-full max-w-2xl mt-12 mb-20 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <form onSubmit={handleSearch} className="relative flex w-full bg-slate-900/60 border border-white/10 p-2 sm:p-3 flex-col sm:flex-row gap-2 shadow-2xl backdrop-blur-2xl rounded-[1.5rem] overflow-hidden">
              <div className="relative flex-1 flex items-center">
                <SearchIcon className="absolute left-6 text-slate-400 w-6 h-6 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('Search global inventory...')}
                  className="w-full pl-16 pr-4 bg-transparent text-white placeholder-slate-400 focus:outline-none border-transparent h-14 text-lg font-medium tracking-wide"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-white text-slate-950 hover:bg-slate-200 font-bold px-8 h-14 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 text-lg">
                Search
              </button>
            </form>
          </div>

          {/* Bento Box Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto mt-12">
            
            {/* Bento Card 1: Sponsored Products (Takes up 2 columns) */}
            <div className="md:col-span-2 relative group rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 overflow-hidden hover:border-white/10 transition-all duration-500">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                       <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400"><Store className="w-5 h-5"/></span>
                       {t('Sponsored Inventory')}
                    </h3>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Featured</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
                    {[...homeProducts].sort((a: any, b: any) => {
                        const aSponsored = a.isSponsored || a.is_sponsored || a.sponsored || a.featured ? 1 : 0;
                        const bSponsored = b.isSponsored || b.is_sponsored || b.sponsored || b.featured ? 1 : 0;
                        return bSponsored - aSponsored;
                    }).slice(0, 3).map((sp: any, idx: number) => {
                        let images = [];
                        try { images = Array.isArray(sp.images) ? sp.images : JSON.parse(sp.images || '[]'); } catch(e) {}
                        return (
                          <div key={idx} onClick={() => { setSelectedProduct({ product: sp, seller: sp.seller }); setActiveImageIndex(0); }} className="bg-slate-950/50 border border-white/5 rounded-2xl p-3 flex flex-col gap-3 hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer group/card h-full">
                            <div className="relative overflow-hidden rounded-xl">
                              <img src={images[0] || "https://images.unsplash.com/photo-1615592389070-bcc97e05ad01?auto=format&fit=crop&w=400&q=80"} alt={sp.title} className="w-full h-28 object-cover group-hover/card:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <h4 className="font-semibold text-slate-200 text-sm truncate">{sp.title}</h4>
                              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span>
                                {sp.seller?.companyName || sp.companyName || sp.brand || 'Verified Seller'}
                              </p>
                              <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
                                <span className="bg-indigo-500/20 text-indigo-300 rounded text-[9px] py-0.5 px-1.5 font-semibold tracking-wider uppercase border border-indigo-500/30">{sp.originType || 'Factory'}</span>
                              </div>
                            </div>
                          </div>
                        );
                    })}
                  </div>
               </div>
            </div>

            {/* Bento Card 2: Mission */}
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
            </div>

          </div>
        </div>
"""

# Regex to replace everything from the first <div className="relative overflow-hidden...
# down to the end of that specific section right before <div className="px-4 sm:px-6 lg:px-8 max-w-7xl...

pattern = re.compile(r'<div className="relative overflow-hidden bg-slate-900 text-white border-b border-slate-800 shadow-sm">.*?<div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-12 space-y-12 flex-1">', re.DOTALL)

if pattern.search(content):
    new_content = pattern.sub(new_hero + '\n      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-12 space-y-12 flex-1">', content)
    with open('src/pages/Home.tsx', 'w') as f:
        f.write(new_content)
    print("Success")
else:
    print("Could not find pattern")
