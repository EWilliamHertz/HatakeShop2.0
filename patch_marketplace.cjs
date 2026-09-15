const fs = require('fs');

let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

// 1. We need a way to track random sorting for companies without flickering
// Wait, we can just shuffle it in useMemo, it's fine for now because `products` only updates on pagination/query change.
// To ensure it doesn't shuffle on every re-render, useMemo based on products is perfect.

const groupedProductsLogic = `
  const isFiltering = Boolean(search || selectedCategoryId || selectedOrigin || minMoq || maxPrice || sortBy !== 'newest' || productType !== 'all');

  const { sponsored, companies, flatProducts } = React.useMemo(() => {
    const groups: { [key: string]: { companyName: string, sellerId: number, products: any[] } } = {};
    const sponsoredList: any[] = [];
    const flatList: any[] = [];
    
    if (!Array.isArray(products)) return { sponsored: [], companies: [], flatProducts: [] };

    products.forEach((item: any) => {
      if (!item) return;
      const p = item.product || item;
      if (!p) return;
      const seller = item.seller || p.seller || {};
      const flatProduct = { ...p, seller };
      flatList.push(flatProduct);

      if (flatProduct.isSponsored) {
        sponsoredList.push(flatProduct);
      }
      
      const cName = seller.companyName || 'Independent Sellers';
      if (!groups[cName]) {
        groups[cName] = { companyName: cName, sellerId: seller.id || flatProduct.sellerId, products: [] };
      }
      groups[cName].products.push(flatProduct);
    });
    
    let companiesArr = Object.values(groups);
    // Shuffle the companies randomly for default view
    if (!isFiltering) {
      for (let i = companiesArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [companiesArr[i], companiesArr[j]] = [companiesArr[j], companiesArr[i]];
      }
    }

    return {
      sponsored: sponsoredList,
      companies: companiesArr,
      flatProducts: flatList
    };
  }, [products, isFiltering]);
`;

code = code.replace(
  /const groupedProducts = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[products\]\);/,
  groupedProductsLogic
);

// 2. Change the rendering block to check isFiltering
const renderingBlock = `
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
                    {flatProducts.filter(p => !p.isSponsored).map((p: any) => (
                       <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              ) : (
                companies.map((group, idx) => (
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
                      {group.products.filter(p => !p.isSponsored).map((p: any) => (
                         <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
`;

code = code.replace(
  /<div className="space-y-12">[\s\S]*?\{groupedProducts\.companies\.map\(\(group, idx\) => \([\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\)}[\s\S]*?<\/div>/,
  renderingBlock
);

fs.writeFileSync('src/pages/Marketplace.tsx', code);
console.log("Patched Marketplace.tsx");
