const fs = require('fs');

let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

const returnStart = code.indexOf('return (');
const codeBeforeReturn = code.substring(0, returnStart);

const newReturn = `return (
    <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col">
      <Helmet>
        <title>Marketplace | Hatake</title>
        <meta name="description" content="Discover wholesale products on Hatake Marketplace." />
      </Helmet>
      <div className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('Wholesale Marketplace')}</h1>
          <form onSubmit={handleSearch} className="flex-1 max-w-md flex relative">
            <input 
              type="text" 
              value={searchInput} 
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('Search products...')}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] placeholder-slate-500 pr-24 outline-none transition-all"
            />
            <button type="submit" className="absolute right-1 top-1 bottom-1 bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black px-4 rounded-lg font-bold text-sm transition-colors shadow-sm">
              {t('Search')}
            </button>
          </form>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
          <div className="flex items-center space-x-2 text-white font-bold text-lg mb-2">
            <Filter className="w-5 h-5 text-[#ffcc00]" />
            <h2>{t('Filters')}</h2>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">{t('Category')}</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none"
            >
              <option value="">{t('All Categories')}</option>
              {Array.isArray(categoriesData) && categoriesData.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">{t('Product Type')}</label>
            <div className="space-y-2">
              {['all', 'sealed', 'graded'].map(type => (
                <label key={type} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    value={type}
                    checked={productType === type}
                    onChange={(e) => setProductType(e.target.value)}
                    className="text-[#ffcc00] focus:ring-[#ffcc00] bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300 capitalize text-sm">{t(type)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">{t('Origin')}</label>
            <select 
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#ffcc00] transition-colors"
            >
              <option value="">{t('Any Origin')}</option>
              <option value="Japan">{t('Japan')}</option>
              <option value="US">{t('United States')}</option>
              <option value="Europe">{t('Europe')}</option>
              <option value="China">{t('China')}</option>
            </select>
          </div>

          <div className="space-y-4">
             <div>
               <label className="block text-sm font-bold text-slate-300 mb-2">{t('Min MOQ')}</label>
               <input type="number" min="1" value={minMoq} onChange={e => setMinMoq(e.target.value)} placeholder="e.g. 50" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none" />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-300 mb-2">{t('Max Unit Price')}</label>
               <input type="number" min="0" step="0.01" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g. 100" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none" />
             </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="flex justify-end mb-6">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm font-medium outline-none focus:border-[#ffcc00] transition-colors"
            >
              <option value="newest">{t('Newest Arrivals')}</option>
              <option value="price_asc">{t('Price: Low to High')}</option>
              <option value="price_desc">{t('Price: High to Low')}</option>
              <option value="moq_asc">{t('MOQ: Low to High')}</option>
            </select>
          </div>

          {error ? (
            <div className="p-6 bg-red-950/50 border border-red-500 rounded-2xl text-red-200 my-8">
              <h3 className="font-bold text-lg mb-2">API Connection Failed</h3>
              <p className="font-mono text-xs whitespace-pre-wrap">{error.message}</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-20 text-slate-400 animate-pulse">{t('Loading products...')}</div>
          ) : flatProducts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center py-32">
              <PackageSearch className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{t('No products found')}</h3>
              <p className="text-slate-400 max-w-md text-center">{t('Try adjusting your filters or search query.')}</p>
            </div>
          ) : (
            <div className="space-y-12">
              {sponsored.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-[#ffcc00] flex items-center gap-2 uppercase tracking-wider">
                    <span className="w-2 h-6 bg-[#ffcc00] rounded-sm"></span>
                    Sponsored & Featured
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sponsored.map((p: any) => (
                       <ProductCard key={\`sponsored-\${p?.id || Math.random()}\`} p={p} formatPrice={formatPrice} t={t} isSponsored={true} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              )}

              {isFiltering ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white mb-6">Search Results</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flatProducts.filter((p: any) => !p.isSponsored).map((p: any) => (
                       <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              ) : (
                companies.map((group: any, idx: number) => (
                  <div key={idx} className="space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shrink-0">
                           <Building2 className="w-6 h-6 text-slate-400" />
                         </div>
                         <div>
                           <h2 className="text-xl font-bold text-white">{group.companyName}</h2>
                           <p className="text-sm text-slate-400">Seller ID: {group.sellerId || 'Independent'}</p>
                         </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.products.filter((p: any) => !p.isSponsored).map((p: any) => (
                         <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}`;

fs.writeFileSync('src/pages/Marketplace.tsx', codeBeforeReturn + newReturn);
console.log("Fixed Marketplace.tsx return syntax");
