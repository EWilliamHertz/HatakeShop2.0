const fs = require('fs');

let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

// 1. Replace groupedProducts definition
const groupedProductsOld = ` const groupedProducts = React.useMemo(() => {
    const groups: { [key: string]: { companyName: string, sellerId: number, products: any[] } } = {};
    const sponsored: any[] = [];
    
    if (!Array.isArray(products)) return { sponsored: [], companies: [] };

    products.forEach((item: any) => {
      if (!item) return;
      // Flatten the product safely so ProductCard can read p.title and p.images
      const p = item.product || item;
      if (!p) return;
      const seller = item.seller || p.seller || {};
            const flatProduct = { ...p, seller };

      if (flatProduct.isSponsored) {
        sponsored.push(flatProduct);
      }
      const cName = seller.companyName || 'Independent Sellers';
      if (!groups[cName]) {
        groups[cName] = { companyName: cName, sellerId: seller.id || flatProduct.sellerId, products: [] };
      }
      groups[cName].products.push(flatProduct);
    });
    
    return {
      sponsored,
      companies: Object.values(groups)
    };
  }, [products]);`;

const groupedProductsNew = `
  const isFiltering = Boolean(search || selectedCategoryId || selectedOrigin || minMoq || maxPrice || sortBy !== 'newest' || productType !== 'all');

  const groupedProducts = React.useMemo(() => {
    const groups: { [key: string]: { companyName: string, sellerId: number, products: any[] } } = {};
    const sponsored: any[] = [];
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
        sponsored.push(flatProduct);
      }
      const cName = seller.companyName || 'Independent Sellers';
      if (!groups[cName]) {
        groups[cName] = { companyName: cName, sellerId: seller.id || flatProduct.sellerId, products: [] };
      }
      groups[cName].products.push(flatProduct);
    });
    
    let companiesArr = Object.values(groups);
    if (!isFiltering) {
      for (let i = companiesArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [companiesArr[i], companiesArr[j]] = [companiesArr[j], companiesArr[i]];
      }
    }

    return {
      sponsored,
      companies: companiesArr,
      flatProducts: flatList
    };
  }, [products, isFiltering]);
`;

code = code.replace(groupedProductsOld, groupedProductsNew);

// 2. Replace the rendering block
const renderOld = `              {groupedProducts.companies.map((group, idx) => (
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
                    {group.products.map((p: any) => (
                       <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              ))}`;

const renderNew = `              {isFiltering ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white mb-6">Search Results</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.flatProducts.filter(p => !p.isSponsored).map((p: any) => (
                       <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              ) : (
                groupedProducts.companies.map((group, idx) => (
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
              )}`;

code = code.replace(renderOld, renderNew);

fs.writeFileSync('src/pages/Marketplace.tsx', code);
console.log("Patched Marketplace safely");
