import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Package, BadgeCheck, Search, ArrowLeft, Tag, ChevronDown, ArrowUpDown, Box, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProductModal } from '../components/ProductModal.tsx';
import { PreorderCard } from '../components/PreorderCard.tsx';
import { useCurrency } from '../components/CurrencyProvider.tsx';
import './scrollbar.css';

const formatLang = (l: string) => {
  if (!l) return l;
  if (l.toLowerCase() === 'zh-hans') return 'S-Chinese';
  if (l.toLowerCase() === 'zh-hant') return 'T-Chinese';
  return l;
};


export function CompanyListings() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['companyProfile', id],
    queryFn: async () => {
      const res = await fetch(`/api-v2/company/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });



  const { company, products = [] } = data || {};
  const safeProducts = Array.isArray(products) ? products : [];

  // Derive categories from safeProducts
  const { categories, languages, types, brands } = useMemo(() => {
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
  }, [safeProducts]);

  const filtered = useMemo(() => {
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
  }, [safeProducts, search, selectedCategories, selectedLanguages, selectedTypes, selectedBrands, sortOption]);

  const hasFilters = brands.length > 0 || categories.length > 0 || languages.length > 0 || types.length > 0;

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Helmet>
        <title>{company?.companyName || 'Company'} — All Listings | Hatake</title>
      </Helmet>

      {/* Sub-header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 min-w-0">
          <Link
            to={`/company/${id}`}
            onClick={() => window.scrollTo(0, 0)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <span className="text-slate-700 shrink-0">|</span>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {company?.profilePictureUrl && (
              <img src={company?.profilePictureUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
            )}
            <span className="text-white font-semibold text-sm truncate">{company?.companyName}</span>
            {company?.verificationStatus === 'verified' && (
              <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
          </div>
          <span className="text-xs text-slate-500 shrink-0 tabular-nums">
            {filtered.length}/{safeProducts.length}
          </span>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 pt-6">

        {/* Top controls bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap sm:flex-nowrap">
          <h1 className="text-xl font-bold text-white shrink-0">All Listings</h1>

          {/* Search */}
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={e => updateSearchParam('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
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

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortOption}
              onChange={(e) => updateSearchParam('sort', e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-2.5 pl-3 pr-8 text-sm font-medium focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-low">Price ↑</option>
              <option value="price-high">Price ↓</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter toggle (only show if there are filterable options) */}
          {hasFilters && (
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all shrink-0 ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter by</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
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
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'
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
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'
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
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'
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

        {/* Active filter chips (always visible when filters are set) */}
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
            <button
              onClick={clearAllFilters}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 ? (
          <>
            {/* Preorder section header — only shown when preorders exist */}
            {filtered.some((p: any) => p.isPreorder) && (
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-sm">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  Pre-Order Available
                </span>
                <span className="text-xs text-slate-500">{filtered.filter((p: any) => p.isPreorder).length} items</span>
                <div className="flex-1 h-px bg-amber-500/20" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filtered.map((p: any) => {
                if (p.isPreorder) {
                  return (
                    <PreorderCard
                      key={p.id}
                      product={p}
                      formatPrice={formatPrice}
                      onClick={() => setSelectedProduct(p)}
                    />
                  );
                }

                let images: string[] = [];
                try { images = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch {}
                let tiers: any[] = [];
                try { tiers = Array.isArray(p.tieredPricing) ? p.tieredPricing : JSON.parse(p.tieredPricing || '[]'); } catch {}
                const tierPrices = (Array.isArray(tiers) ? tiers : []).map((t: any) => Number(t.price ?? t.unitPrice)).filter((n: number) => Number.isFinite(n) && n > 0);
                const basePrice = Number(p.unitCost ?? p.unitPrice);
                const lowestPrice = tierPrices.length > 0 ? Math.min(...tierPrices) : (Number.isFinite(basePrice) && basePrice > 0 ? basePrice : null);

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-slate-800 overflow-hidden relative">
                      {images[0]
                        ? <img src={images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center text-slate-600"><Package className="w-8 h-8" /></div>}
                      <div className="absolute top-2 left-2">
                        <span className="bg-slate-900/90 backdrop-blur text-slate-300 text-[10px] font-semibold px-2 py-1 rounded-full border border-slate-700">
                          MOQ: {p.moq || '—'}
                        </span>
                      </div>
                      {(p.isSponsored || p.featured) && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-yellow-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Featured</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-slate-200 line-clamp-2 mb-1 group-hover:text-cyan-400 transition-colors text-sm">{p.title}</h3>
                      {p.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">{p.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
                        {p.brand && (
                          <span className="text-[10px] bg-[#ffcc00]/10 border border-[#ffcc00]/20 text-[#ffcc00] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            {p.brand}
                          </span>
                        )}
                        {p.sealedType && p.sealedType !== 'other' && (
                          <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full capitalize">
                            {p.sealedType.replace('_', ' ')}
                          </span>
                        )}
                        {(p.categoryName || p.category) && (
                          <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                            {p.categoryName || p.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-auto pt-2 border-t border-slate-800/50">
                        {lowestPrice
                          ? <div><div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">From</div><div className="text-base font-bold text-white">{formatPrice(lowestPrice)}<span className="text-slate-500 text-xs font-normal">/unit</span></div></div>
                          : <div className="text-sm font-medium text-slate-400">Price on request</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-24 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No listings match your filters.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="mt-4 text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}
