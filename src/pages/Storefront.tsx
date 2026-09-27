import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { MapPin, ShieldCheck, Box, Info, Search, Tag, ArrowUpDown, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { VendorReviews } from '../components/VendorReviews.tsx';
import './scrollbar.css';

const formatLang = (l: string) => {
  if (!l) return l;
  if (l.toLowerCase() === 'zh-hans') return 'S-Chinese';
  if (l.toLowerCase() === 'zh-hant') return 'T-Chinese';
  return l;
};


export function Storefront() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = searchParams.get('search') || '';
  const selectedCategories = searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [];
  const selectedLanguages = searchParams.get('languages') ? searchParams.get('languages')!.split(',') : [];
  const selectedBrands = searchParams.get('brands') ? searchParams.get('brands')!.split(',') : [];
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

  const clearAllFilters = () => setSearchParams(new URLSearchParams());

  const activeFilterCount =
    selectedCategories.length +
    selectedLanguages.length +
    selectedBrands.length +
    selectedTypes.length +
    (search ? 1 : 0);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center text-slate-400">
        Store not found.
      </div>
    );
  }

  const { store, products } = storeData;

  const safeProducts = Array.isArray(products) ? products : [];

  const { categories, languages, types, brands } = (() => {
    const cats: Record<string, number> = {};
    const langs: Record<string, number> = {};
    const typs: Record<string, number> = {};
    const brnds: Record<string, number> = {};

    safeProducts.forEach((p: any) => {
      const cat = p?.categoryName || p?.category || p?.originType || 'Other';
      cats[cat] = (cats[cat] || 0) + 1;
      
      const lang = p?.language || 'Unknown';
      langs[lang] = (langs[lang] || 0) + 1;
      
      const typ = p?.sealedType || p?.productType || 'Unknown';
      const brnd = p?.brand;
      if (brnd) brnds[brnd] = (brnds[brnd] || 0) + 1;
      typs[typ] = (typs[typ] || 0) + 1;
    });
    
    return {
      categories: Object.entries(cats).sort((a, b) => b[1] - a[1]),
      languages: Object.entries(langs).sort((a, b) => b[1] - a[1]),
      types: Object.entries(typs).sort((a, b) => b[1] - a[1]),
      brands: Object.entries(brnds).sort((a, b) => b[1] - a[1]),
    };
  })();

  const filteredProducts = (() => {
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
      const pBrnd = p?.brand;
      const matchesBrand = selectedBrands.length === 0 || (pBrnd && selectedBrands.includes(pBrnd));
      const matchesTyp = selectedTypes.length === 0 || selectedTypes.includes(pTyp);
      
      return matchesSearch && matchesCat && matchesLang && matchesTyp && matchesBrand;
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
  })();

  const hasFilters = brands.length > 0 || categories.length > 0 || languages.length > 0 || types.length > 0;

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
              <span className="flex items-center gap-1.5"><Box className="w-4 h-4"/> {safeProducts.length} Products</span>
            </div>
          </div>
          <button className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 px-4 py-2.5">
            Contact Seller
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Products Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-extrabold text-slate-100">Store Catalog</h2>
              <span className="text-sm text-slate-500 tabular-nums">{filteredProducts.length} of {safeProducts.length}</span>
            </div>
            
            {/* Controls bar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap sm:flex-nowrap">
              {/* Search */}
              <div className="flex-1 min-w-0 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={search}
                  onChange={e => updateSearchParam('search', e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
                />
                {search && (
                  <button
                    onClick={() => updateSearchParam('search', '')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="relative shrink-0">
                <select
                  value={sortOption}
                  onChange={(e) => updateSearchParam('sort', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl text-slate-300 py-2.5 pl-3 pr-8 text-sm font-medium focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price-low">Price ↑</option>
                  <option value="price-high">Price ↓</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Filter toggle */}
              {hasFilters && (
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all shrink-0 ${
                    filtersOpen || activeFilterCount > 0
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-cyan-500 text-slate-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Expandable Filters Panel */}
            {filtersOpen && hasFilters && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter by</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>

                {/* IP / Brand */}
                {brands.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">IP / Brand</p>
                    <div className="flex flex-wrap gap-2">
                      {brands.map(([brand, count]) => (
                        <button
                          key={brand}
                          onClick={() => toggleMultiParam('brands', brand)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            selectedBrands.includes(brand)
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 ring-1 ring-indigo-500/20'
                              : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          {brand} <span className="opacity-60">({count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category */}
                {categories.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(([cat, count]) => (
                        <button
                          key={cat}
                          onClick={() => toggleMultiParam('categories', cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            selectedCategories.includes(cat)
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ring-1 ring-cyan-500/20'
                              : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          {cat} <span className="opacity-60">({count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Language */}
                {languages.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Language</p>
                    <div className="flex flex-wrap gap-2">
                      {languages.map(([lang, count]) => (
                        <button
                          key={lang}
                          onClick={() => toggleMultiParam('languages', lang)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            selectedLanguages.includes(lang)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                              : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          {formatLang(lang)} <span className="opacity-60">({count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active filter chips (collapsed state) */}
            {!filtersOpen && activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <span className="text-xs text-slate-500 shrink-0">Active:</span>
                {selectedBrands.map(b => (
                  <button
                    key={b}
                    onClick={() => toggleMultiParam('brands', b)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all"
                  >
                    {b} <X className="w-3 h-3 opacity-60" />
                  </button>
                ))}
                {selectedCategories.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleMultiParam('categories', c)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all"
                  >
                    {c} <X className="w-3 h-3 opacity-60" />
                  </button>
                ))}
                {selectedLanguages.map(l => (
                  <button
                    key={l}
                    onClick={() => toggleMultiParam('languages', l)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                  >
                    {formatLang(l)} <X className="w-3 h-3 opacity-60" />
                  </button>
                ))}
                <button onClick={clearAllFilters} className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1">
                  Clear all
                </button>
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <Box className="w-12 h-12 text-slate-500 mb-4 opacity-50" />
                <p className="text-slate-400 font-medium mb-1">No products match your filters.</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="mt-3 text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProducts.map((p: any) => (
                  <Link key={p.id} to={`/products/${p.id}`} className="btn-secondary group">
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
          <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sticky top-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
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
