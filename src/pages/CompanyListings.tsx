import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Package, BadgeCheck, Search, ArrowLeft, Tag, ChevronDown, ArrowUpDown, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProductModal } from '../components/ProductModal.tsx';
import { useCurrency } from '../components/CurrencyProvider.tsx';

export function CompanyListings() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8 py-4 flex items-center gap-4 flex-wrap">
          <Link to={`/company/${id}`} onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </Link>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            {company?.profilePictureUrl && <img src={company?.profilePictureUrl} alt="" className="w-6 h-6 rounded-full object-cover" />}
            <span className="text-white font-semibold text-sm">{company?.companyName}</span>
            {company?.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 text-cyan-400" />}
          </div>
          <span className="ml-auto text-xs text-slate-500 shrink-0">{filtered.length} of {safeProducts.length} listings</span>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-8 pt-8">

        {/* Filters bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold text-white shrink-0">All Listings</h1>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={e => updateSearchParam('search', e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
            />
          </div>

          {/* Filters Area */}
          <div className="flex flex-col gap-5 w-full">
            {/* Category pills */}
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <Tag className="w-4 h-4 text-slate-500 shrink-0" />
                {categories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => toggleMultiParam('categories', cat)}
                    className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${selectedCategories.includes(cat) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}
                  >
                    {cat} ({count})
                  </button>
                ))}
              </div>
            )}
            {/* Language pills */}
            {languages.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-4 text-center">L</span>
                {languages.map(([lang, count]) => (
                  <button
                    key={lang}
                    onClick={() => toggleMultiParam('languages', lang)}
                    className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${selectedLanguages.includes(lang) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}
                  >
                    {lang} ({count})
                  </button>
                ))}
              </div>
            )}
            
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 md:ml-auto">
            <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => updateSearchParam('sort', e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl text-slate-300 py-1.5 pl-3 pr-8 text-xs font-semibold focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {filtered.map((p: any) => {
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
                  className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer flex flex-col"
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
                    {(p.category || p.originType) && (
                      <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full w-fit mb-2">
                        {p.category || p.originType}
                      </span>
                    )}
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
        ) : (
          <div className="text-center py-24 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No listings match your filters.</p>
            {(search || selectedCategories.length > 0 || selectedLanguages.length > 0 || selectedTypes.length > 0) && (
              <button onClick={() => { setSearchParams(new URLSearchParams()); }} className="mt-4 text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
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
