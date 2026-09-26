import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { MapPin, ShieldCheck, Box, Info, Search, Tag, ArrowUpDown, ChevronDown } from 'lucide-react';
import { VendorReviews } from '../components/VendorReviews.tsx';

export function Storefront() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const selectedCategories = searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [];
  const selectedLanguages = searchParams.get('languages') ? searchParams.get('languages')!.split(',') : [];
  const selectedTypes = searchParams.get('types') ? searchParams.get('types')!.split(',') : [];
  const sortOption = searchParams.get('sort') || 'newest';

  const updateSearchParam = (key: string, value: string) => {
    setSearchParams(prev => {
      if (!value || (key === 'sort' && value === 'newest')) {
        prev.delete(key);
      } else {
        prev.set(key, value);
      }
      return prev;
    });
  };

  const toggleMultiParam = (key: string, value: string) => {
    setSearchParams(prev => {
      const current = prev.get(key) ? prev.get(key)!.split(',') : [];
      if (current.includes(value)) {
        const next = current.filter(v => v !== value);
        if (next.length === 0) prev.delete(key);
        else prev.set(key, next.join(','));
      } else {
        prev.set(key, [...current, value].join(','));
      }
      return prev;
    });
  };
  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetch(`/api-v2/store/${slug}`);
        if (res.ok) {
          setStoreData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [slug]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading storefront...</div>;
  if (!storeData?.store) return <div className="p-12 text-center text-slate-400 font-medium">Store not found.</div>;

  const { store, products } = storeData;

  const safeProducts = Array.isArray(products) ? products : [];

  const { categories, languages, types } = useMemo(() => {
    const cats: Record<string, number> = {};
    const langs: Record<string, number> = {};
    const typs: Record<string, number> = {};

    safeProducts.forEach((p: any) => {
      const cat = p?.categoryName || p?.category || p?.originType || 'Other';
      cats[cat] = (cats[cat] || 0) + 1;
      
      const lang = p?.language || 'Unknown';
      langs[lang] = (langs[lang] || 0) + 1;
      
      const typ = p?.sealedType || p?.productType || 'Unknown';
      typs[typ] = (typs[typ] || 0) + 1;
    });
    
    return {
      categories: Object.entries(cats).sort((a, b) => b[1] - a[1]),
      languages: Object.entries(langs).sort((a, b) => b[1] - a[1]),
      types: Object.entries(typs).sort((a, b) => b[1] - a[1]),
    };
  }, [safeProducts]);

  const filteredProducts = useMemo(() => {
    const results = safeProducts.filter((p: any) => {
      if (!p) return false;
      const pTitle = String(p.title || '');
      const pDesc = String(p.description || '');
      const searchLower = String(search || '').toLowerCase();
      
      const matchesSearch = !search ||
        pTitle.toLowerCase().includes(searchLower) ||
        pDesc.toLowerCase().includes(searchLower);
        
      const pCat = p?.categoryName || p?.category || p?.originType || 'Other';
      const pLang = p?.language || 'Unknown';
      const pTyp = p?.sealedType || p?.productType || 'Unknown';
      
      const matchesCat = selectedCategories.length === 0 || selectedCategories.includes(pCat);
      const matchesLang = selectedLanguages.length === 0 || selectedLanguages.includes(pLang);
      const matchesTyp = selectedTypes.length === 0 || selectedTypes.includes(pTyp);
      
      return matchesSearch && matchesCat && matchesLang && matchesTyp;
    });

    results.sort((a: any, b: any) => {
      const getLowestPrice = (p: any) => {
        let tiers: any[] = [];
        try { tiers = Array.isArray(p.tieredPricing) ? p.tieredPricing : JSON.parse(p.tieredPricing || '[]'); } catch {}
        const tierPrices = (Array.isArray(tiers) ? tiers : []).map((t: any) => Number(t.price ?? t.unitPrice)).filter((n: number) => Number.isFinite(n) && n > 0);
        const basePrice = Number(p.unitCost ?? p.unitPrice);
        return tierPrices.length > 0 ? Math.min(...tierPrices) : (Number.isFinite(basePrice) && basePrice > 0 ? basePrice : Infinity);
      };

      switch (sortOption) {
        case 'price-low':
          return getLowestPrice(a) - getLowestPrice(b);
        case 'price-high':
          return getLowestPrice(b) - getLowestPrice(a);
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return results;
  }, [safeProducts, search, selectedCategories, selectedLanguages, selectedTypes, sortOption]);

  return (
    <div className="bg-slate-900 min-h-screen -mt-4 pb-12">
      <Helmet>
        <title>{store.companyName || 'Store'} | Hatake</title>
        <meta name="description" content={`Shop products from ${store.companyName} on Hatake Marketplace.`} />
      </Helmet>
      {/* Banner */}
      <div className="w-full h-48 md:h-64 bg-slate-800 relative overflow-hidden shadow-sm">
        {store.storeBannerUrl ? (
          <img src={store.storeBannerUrl} alt={store.companyName} className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-700 opacity-90"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        {/* Store Header Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 shadow-sm">
          <div>
            <h1 className="heading-xl text-slate-100 mb-2 flex items-center gap-3">
              {store.companyName}
              <ShieldCheck className="w-7 h-7 text-[#ffcc00]" />
            </h1>
            <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
              {store.country && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/> {store.country}</span>
              )}
              <span className="flex items-center gap-1.5"><Box className="w-4 h-4"/> {products.length} Products</span>
            </div>
          </div>
          <button className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 px-4 py-2.5">
            Contact Seller
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Products Grid */}
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold text-slate-100 mb-6">Store Catalog</h2>
            
            {/* Filters bar */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search catalog..."
                    value={search}
                    onChange={e => updateSearchParam('search', e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 md:ml-auto w-full md:w-auto">
                  <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="relative w-full md:w-auto">
                    <select
                      value={sortOption}
                      onChange={(e) => updateSearchParam('sort', e.target.value)}
                      className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-xl text-slate-300 py-2.5 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Filters Area */}
              <div className="flex flex-col gap-3">
                {/* Category pills */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-500 shrink-0" />
                    {categories.map(([cat, count]) => (
                      <button
                        key={cat}
                        onClick={() => toggleMultiParam('categories', cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedCategories.includes(cat) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}
                      >
                        {cat} ({count})
                      </button>
                    ))}
                  </div>
                )}
                {/* Language pills */}
                {languages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-4 text-center">L</span>
                    {languages.map(([lang, count]) => (
                      <button
                        key={lang}
                        onClick={() => toggleMultiParam('languages', lang)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedLanguages.includes(lang) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}
                      >
                        {lang} ({count})
                      </button>
                    ))}
                  </div>
                )}
                {/* Type pills */}
                {types.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Box className="w-4 h-4 text-slate-500 shrink-0" />
                    {types.map(([typ, count]) => (
                      <button
                        key={typ}
                        onClick={() => toggleMultiParam('types', typ)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedTypes.includes(typ) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}
                      >
                        {typ} ({count})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <Box className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-slate-400 font-medium">No products match your filters.</p>
                {(search || selectedCategories.length > 0 || selectedLanguages.length > 0 || selectedTypes.length > 0) && (
                  <button onClick={() => { setSearchParams(new URLSearchParams()); }} className="mt-4 text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((p: any) => (
                  <Link key={p.id} to={`/products/${p.id}`} className="btn-secondary">
                    <div className="h-52 bg-slate-900 flex items-center justify-center p-6 border-b border-slate-700">
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt={p.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Box className="w-12 h-12 text-slate-400" />
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <p className="text-xs font-semibold text-[#ffcc00] mb-1.5 uppercase tracking-wider">{p.brand}</p>
                      <h3 className="font-semibold text-slate-100 mb-3 line-clamp-2 leading-tight group-hover:text-[#ffcc00] transition-colors">{p.title}</h3>
                      <div className="mt-auto pt-4 border-t border-slate-700 flex justify-between items-end">
                        <div>
                          <p className="text-xl font-bold tracking-tight text-slate-100">${Number(p.unitCost).toFixed(2)}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">MOQ: {p.moq}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Store Policies Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sticky top-6">
              <h3 className="text-2xl font-bold text-white text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
                <Info className="w-5 h-5 text-[#ffcc00]" />
                Store Policies
              </h3>
              <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                {store.storePolicies || "This seller hasn't added custom store policies yet. Standard Hatake.Shop B2B buyer protection applies to all orders."}
              </div>
            </div>
            <VendorReviews vendorId={store.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
