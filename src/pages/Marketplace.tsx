import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, PackageSearch, Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCurrency } from '../components/CurrencyContext.tsx';
import { ProductModal } from '../components/ProductModal.tsx';
import { WishlistButton } from '../components/WishlistButton.tsx';

const ProductCard = ({ p, formatPrice, t, isSponsored = false, onSelect }: any) => {
  return (
    <div 
      onClick={() => onSelect && onSelect(p)}
      className={`cursor-pointer bg-slate-900 border ${isSponsored ? 'border-[#ffcc00]/50 shadow-[0_0_15px_rgba(255,204,0,0.1)]' : 'border-slate-800 hover:border-slate-600'} transition-all rounded-2xl overflow-hidden group shadow-lg flex flex-col relative`}
    >
      <WishlistButton productId={p.id} />
      {isSponsored && (
        <div className="absolute top-3 right-3 z-10 bg-[#ffcc00] text-black text-[10px] uppercase font-black px-2 py-1 rounded shadow-sm tracking-wider">
          Sponsored
        </div>
      )}
      <div className="relative h-48 bg-slate-800 overflow-hidden flex items-center justify-center">
        {p.images && p.images.length > 0 ? (
          <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <PackageSearch className="w-10 h-10 text-slate-600" />
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-white line-clamp-1 mb-1">{p.title}</h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 h-8">{p.description}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
           {p.originType && <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.originType}</span>}
        </div>
        
        <div className="mt-auto space-y-3 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t('Est. Unit Price')}</span>
              <span className="text-xl font-extrabold text-white font-mono tracking-tight">{formatPrice(p.tieredPricing?.length > 0 ? Math.min(...p.tieredPricing.map((t: any) => parseFloat(t.price || t.unitPrice || '0'))) : (p.unitPrice || 0))}</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t('Min Order')}</span>
              <span className="text-sm font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">{p.moq} units</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function Marketplace() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ origin: "", category: "", minMoq: "", maxPrice: "", sortBy: "newest" });
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api-v2/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });

  const { data = {}, isLoading } = useQuery({
    queryKey: ['products', search, page, filters, selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: search,
        page: page.toString(),
        origin: filters.origin,
        minMoq: filters.minMoq,
        maxPrice: filters.maxPrice,
        category: selectedCategoryId ? selectedCategoryId.toString() : filters.category,
        sortBy: filters.sortBy
      });
      const res = await fetch(`/api-v2/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    }
  });

  const products = data.products || [];
  const totalPages = data.totalPages || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const groupedProducts = React.useMemo(() => {
    const groups: { [key: string]: { companyName: string, sellerId: number, products: any[] } } = {};
    const sponsored: any[] = [];
    
    products.forEach((p: any) => {
      if (p.isSponsored) {
        sponsored.push(p);
      }
      const cName = p.seller?.companyName || 'Independent Sellers';
      if (!groups[cName]) {
        groups[cName] = { companyName: cName, sellerId: p.sellerId, products: [] };
      }
      groups[cName].products.push(p);
    });
    
    return {
      sponsored,
      companies: Object.values(groups)
    };
  }, [products]);

  return (
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
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t('Category')}</label>
              <select value={selectedCategoryId || ''} onChange={e => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200">
                <option value="">{t('All Categories')}</option>
                {categoriesData.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{t('Sort By')}</label>
              <select value={filters.sortBy} onChange={e => setFilters({...filters, sortBy: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200">
                <option value="newest">{t('Newest Arrivals')}</option>
                <option value="price_asc">{t('Price: Low to High')}</option>
                <option value="price_desc">{t('Price: High to Low')}</option>
              </select>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center py-20 text-slate-400 animate-pulse">{t('Loading products...')}</div>
          ) : products.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center py-32">
              <PackageSearch className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{t('No products found')}</h3>
              <p className="text-slate-400 max-w-md text-center">{t('Try adjusting your filters or search query.')}</p>
            </div>
          ) : (
            <div className="space-y-12">
              {groupedProducts.sponsored.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-[#ffcc00] flex items-center gap-2 uppercase tracking-wider">
                    <span className="w-2 h-6 bg-[#ffcc00] rounded-sm"></span>
                    Sponsored & Featured
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedProducts.sponsored.map((p: any) => (
                       <ProductCard key={`sponsored-${p.id}`} p={p} formatPrice={formatPrice} t={t} isSponsored={true} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              )}

              {groupedProducts.companies.map((group, idx) => (
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
                       <ProductCard key={p.id} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
