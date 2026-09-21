import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, PackageSearch, Building2, MapPin, ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { languageLabel, sealedTypeLabel, PRODUCT_LANGUAGES } from '../lib/productTaxonomy.ts';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCurrency } from '../components/CurrencyProvider.tsx';
import { ProductModal } from '../components/ProductModal.tsx';
import { WishlistButton } from '../components/WishlistButton.tsx';
const ProductCard = ({ p, formatPrice, t, isSponsored = false, onSelect }: any) => {
  if (!p) return null;
  // Safely parse JSON strings sent by the database driver
  let images = [];
  try { images = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch(e) {}
  
  let tiers = [];
  try { tiers = Array.isArray(p.tieredPricing) ? p.tieredPricing : JSON.parse(p.tieredPricing || '[]'); } catch(e) {}
  return (
    <div 
      onClick={() => onSelect && onSelect(p)}
      className={`cursor-pointer bg-slate-900 border ${isSponsored ? 'border-[#ffcc00]/50 shadow-[0_0_15px_rgba(255,204,0,0.1)]' : 'border-slate-800 hover:border-slate-600'} transition-all rounded-2xl overflow-hidden group shadow-lg flex flex-col relative`}
    >
      <WishlistButton productId={p?.id} />
      {isSponsored && (
        <div className="absolute top-3 right-3 z-10 bg-[#ffcc00] text-black text-[10px] uppercase font-black px-2 py-1 rounded shadow-sm tracking-wider">
          Sponsored
        </div>
      )}
      <div className="relative h-48 bg-slate-800 overflow-hidden flex items-center justify-center">
        {images.length > 0 ? (
          <img src={images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <PackageSearch className="w-10 h-10 text-slate-600" />
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-white line-clamp-1 mb-1">{p.title}</h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 h-8">{p.description}</p>
        
        <div className="flex flex-wrap gap-1.5 mb-4">
           {p.language && (() => { const l = PRODUCT_LANGUAGES.find(x => x.value === p.language); return <span title={languageLabel(p.language)} className="bg-[#ffcc00]/10 text-[#ffcc00] border border-[#ffcc00]/30 text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1">{l?.flag} {l?.short || p.language}</span>; })()}
           {p.sealedType && <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded border border-slate-700 font-semibold">{sealedTypeLabel(p.sealedType)}</span>}
           {p?.seller?.country && <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.seller.country}</span>}
           <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 uppercase tracking-wider">MOQ {p.moq}</span>
        </div>
        
        <div className="mt-auto space-y-3 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t('Est. PPU')}</span>
              <span className="text-xl font-extrabold text-white font-mono tracking-tight">{(() => {
                const minPrice = Array.isArray(tiers) && tiers.length > 0 ? Math.min(...tiers.map((t: any) => parseFloat(t.price || t.unitPrice || '0'))) : (p.unitCost || p.unitPrice || 0);
                return (!minPrice || Number(minPrice) === 0) ? <span className="text-sm font-semibold tracking-wide text-cyan-400">{t("Negotiate")}</span> : formatPrice(Number(minPrice));
              })()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
/* ---------- Sidebar building blocks ---------- */
const FilterSection = ({ title, count, defaultOpen = true, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800 last:border-b-0 pb-4 last:pb-0">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-2 text-left group">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider group-hover:text-white transition-colors flex items-center gap-2">
          {title}
          {count ? <span className="bg-[#ffcc00] text-black text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none">{count}</span> : null}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
};

const FacetCheckbox = ({ label, count, checked, onChange, prefix }: { label: string; count?: number; checked: boolean; onChange: () => void; prefix?: string }) => (
  <label className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${checked ? 'bg-[#ffcc00]/10 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
    <span className="flex items-center gap-2 min-w-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded border-slate-600 bg-slate-800 text-[#ffcc00] focus:ring-[#ffcc00] focus:ring-offset-0 shrink-0" />
      {prefix && <span className="shrink-0">{prefix}</span>}
      <span className="truncate">{label}</span>
    </span>
    {typeof count === 'number' && <span className={`text-[11px] tabular-nums shrink-0 ${checked ? 'text-[#ffcc00]' : 'text-slate-500'}`}>{count}</span>}
  </label>
);

const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 hover:border-red-500/50 hover:bg-red-500/10 text-slate-200 text-xs px-2.5 py-1 rounded-full transition-colors">
    {label} <X className="w-3 h-3" />
  </button>
);

const parseList = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export function Marketplace() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- All filter state lives in the URL so results are shareable/bookmarkable ----
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;
  const selectedLanguages = parseList(searchParams.get('lang'));
  const selectedTypes = parseList(searchParams.get('type'));
  const selectedCountries = parseList(searchParams.get('country'));
  const selectedCategoryId = searchParams.get('category') ? parseInt(searchParams.get('category') as string, 10) : null;
  const maxPrice = searchParams.get('maxPrice') || '';
  const minMoq = searchParams.get('minMoq') || '';
  const sortBy = searchParams.get('sort') || 'newest';

  const [searchInput, setSearchInput] = useState(search);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const updateParams = (patch: Record<string, string | null | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => { if (v === null || v === undefined || v === '') next.delete(k); else next.set(k, v); });
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: false });
  };
  const toggleInList = (key: string, current: string[], value: string) => {
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateParams({ [key]: next.join(',') });
  };
  const clearAll = () => setSearchParams(new URLSearchParams(), { replace: false });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api-v2/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });

  const { data: facets = { languages: [], sealedTypes: [], countries: [] } } = useQuery({
    queryKey: ['marketplace-facets'],
    queryFn: async () => {
      const res = await fetch('/api-v2/marketplace/facets');
      if (!res.ok) return { languages: [], sealedTypes: [], countries: [] };
      return res.json();
    },
    staleTime: 60_000
  });

  const categoryTree = React.useMemo(() => {
    if (!Array.isArray(categoriesData)) return [];
    const map = new Map();
    const roots: any[] = [];
    categoriesData.forEach((c: any) => map.set(c.id, { ...c, children: [] }));
    categoriesData.forEach((c: any) => {
        if (c.parentId) {
            const parent = map.get(c.parentId);
            if (parent) parent.children.push(map.get(c.id));
        } else {
            roots.push(map.get(c.id));
        }
    });
    return roots;
  }, [categoriesData]);

  const { data = {}, isLoading, error } = useQuery({
    queryKey: ['products', search, page, selectedLanguages, selectedTypes, selectedCountries, selectedCategoryId, maxPrice, minMoq, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), sortBy });
      if (search) params.set('q', search);
      if (selectedLanguages.length) params.set('languages', selectedLanguages.join(','));
      if (selectedTypes.length) params.set('sealedTypes', selectedTypes.join(','));
      if (selectedCountries.length) params.set('countries', selectedCountries.join(','));
      if (selectedCategoryId) params.set('category', String(selectedCategoryId));
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minMoq) params.set('minMoq', minMoq);
      const res = await fetch(`/api-v2/products?${params.toString()}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned non-JSON response (${res.status}): ${text.substring(0, 150)}`);
      }
    },
    placeholderData: (prev) => prev
  });

  const products = Array.isArray(data) ? data : (data?.products || []);
  const totalPages = data?.totalPages || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput });
  };

  const activeFilterCount = selectedLanguages.length + selectedTypes.length + selectedCountries.length + (selectedCategoryId ? 1 : 0) + (maxPrice ? 1 : 0) + (minMoq ? 1 : 0);
  const isFiltering = Boolean(search || activeFilterCount > 0 || sortBy !== 'newest');

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

  // Group sealed types by their group label (Boxes / Packs / Decks / ...)
  const typeGroups = React.useMemo(() => {
    const out: Record<string, any[]> = {};
    (facets.sealedTypes || []).forEach((s: any) => { (out[s.group] ||= []).push(s); });
    return out;
  }, [facets.sealedTypes]);

  const categoryName = (id: number | null) => (Array.isArray(categoriesData) ? categoriesData : []).find((c: any) => c.id === id)?.name;

  const sidebar = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 text-white font-bold text-lg">
          <Filter className="w-5 h-5 text-[#ffcc00]" />
          <h2>{t('Filters')}</h2>
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-xs text-slate-400 hover:text-[#ffcc00] font-semibold transition-colors">{t('Clear all')}</button>
        )}
      </div>

      <div className="space-y-4">
        {/* Language — the primary way buyers shop sealed product */}
        <FilterSection title={t('Language / Edition')} count={selectedLanguages.length}>
          {(facets.languages || []).length === 0 && <p className="text-xs text-slate-500 px-2">{t('No language data yet')}</p>}
          {(facets.languages || []).map((l: any) => (
            <FacetCheckbox key={l.value} prefix={l.flag} label={t(l.label)} count={l.count} checked={selectedLanguages.includes(l.value)} onChange={() => toggleInList('lang', selectedLanguages, l.value)} />
          ))}
        </FilterSection>

        {/* Product type */}
        <FilterSection title={t('Product Type')} count={selectedTypes.length}>
          {Object.keys(typeGroups).length === 0 && <p className="text-xs text-slate-500 px-2">{t('No product type data yet')}</p>}
          {Object.entries(typeGroups).map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-1 pb-0.5">{t(group)}</div>
              {items.map((s: any) => (
                <FacetCheckbox key={s.value} label={t(s.label)} count={s.count} checked={selectedTypes.includes(s.value)} onChange={() => toggleInList('type', selectedTypes, s.value)} />
              ))}
            </div>
          ))}
        </FilterSection>

        {/* Category tree */}
        <FilterSection title={t('Category')} count={selectedCategoryId ? 1 : 0} defaultOpen={false}>
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            <button 
              onClick={() => updateParams({ category: null })} 
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all ${selectedCategoryId === null ? 'bg-[#ffcc00]/10 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              {t('All Categories')}
            </button>
            {categoryTree.map((parent: any) => (
              <div key={parent.id}>
                <button 
                  onClick={() => updateParams({ category: String(parent.id) })}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-all ${selectedCategoryId === parent.id ? 'bg-[#ffcc00]/10 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  {parent.name}
                </button>
                {parent.children.length > 0 && (
                  <div className="pl-3 ml-2 border-l border-slate-800 space-y-0.5">
                    {parent.children.map((child: any) => (
                      <button 
                        key={child.id}
                        onClick={() => updateParams({ category: String(child.id) })}
                        className={`w-full text-left px-2 py-1 rounded-lg text-sm transition-all ${selectedCategoryId === child.id ? 'bg-[#ffcc00]/10 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Ships from — replaces the old include/exclude country + region multi-selects */}
        <FilterSection title={t('Ships From')} count={selectedCountries.length} defaultOpen={false}>
          {(facets.countries || []).length === 0 && <p className="text-xs text-slate-500 px-2">{t('No seller locations yet')}</p>}
          {(facets.countries || []).map((c: any) => (
            <FacetCheckbox key={c.value} prefix={<MapPin className="w-3 h-3 text-slate-500" /> as any} label={c.value} count={c.count} checked={selectedCountries.includes(c.value)} onChange={() => toggleInList('country', selectedCountries, c.value)} />
          ))}
        </FilterSection>

        {/* Price & MOQ */}
        <FilterSection title={t('Price & Quantity')} count={(maxPrice ? 1 : 0) + (minMoq ? 1 : 0)} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 px-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{t('Max Price')}</label>
              <input type="number" min="0" value={maxPrice} onChange={e => updateParams({ maxPrice: e.target.value })} placeholder="∞" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:border-[#ffcc00] outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{t('Max MOQ')}</label>
              <input type="number" min="1" value={minMoq} onChange={e => updateParams({ minMoq: e.target.value })} placeholder="Any" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:border-[#ffcc00] outline-none" />
            </div>
          </div>
        </FilterSection>
      </div>
    </>
  );

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col">
      <Helmet>
        <title>Marketplace | Hatake</title>
        <meta name="description" content="Discover wholesale sealed TCG products on Hatake Marketplace." />
      </Helmet>
      <div className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
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
      
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Mobile filter toggle */}
        <button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="md:hidden flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-white">
          <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-[#ffcc00]" /> {t('Filters')} {activeFilterCount > 0 && <span className="bg-[#ffcc00] text-black text-[10px] px-1.5 py-0.5 rounded-full font-black">{activeFilterCount}</span>}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
        </button>

        <aside className={`${mobileFiltersOpen ? 'block' : 'hidden'} md:block w-full md:w-72 shrink-0 bg-slate-900 border border-slate-800 p-5 rounded-2xl h-fit md:sticky md:top-6`}>
          {sidebar}
        </aside>

      <main className="flex-1 min-w-0">
          {/* Toolbar: active filters + sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
              {search && <Chip label={`"${search}"`} onRemove={() => { setSearchInput(''); updateParams({ q: null }); }} />}
              {selectedLanguages.map(v => { const l = (facets.languages || []).find((x: any) => x.value === v); return <Chip key={v} label={`${l?.flag || ''} ${t(l?.label || v)}`} onRemove={() => toggleInList('lang', selectedLanguages, v)} />; })}
              {selectedTypes.map(v => { const s = (facets.sealedTypes || []).find((x: any) => x.value === v); return <Chip key={v} label={t(s?.label || v)} onRemove={() => toggleInList('type', selectedTypes, v)} />; })}
              {selectedCountries.map(v => <Chip key={v} label={v} onRemove={() => toggleInList('country', selectedCountries, v)} />)}
              {selectedCategoryId && <Chip label={categoryName(selectedCategoryId) || t('Category')} onRemove={() => updateParams({ category: null })} />}
              {maxPrice && <Chip label={`≤ ${formatPrice(Number(maxPrice))}`} onRemove={() => updateParams({ maxPrice: null })} />}
              {minMoq && <Chip label={`MOQ ≤ ${minMoq}`} onRemove={() => updateParams({ minMoq: null })} />}
              {(activeFilterCount > 0 || search) && <button onClick={() => { setSearchInput(''); clearAll(); }} className="text-xs text-slate-400 hover:text-white underline underline-offset-2 ml-1">{t('Clear all')}</button>}
              {!activeFilterCount && !search && <span className="text-sm text-slate-500">{t('Showing all sealed products')}</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Sort By')}</label>
              <select value={sortBy} onChange={e => updateParams({ sort: e.target.value })} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-[#ffcc00] outline-none text-slate-200">
                <option value="newest">{t('Newest Arrivals')}</option>
                <option value="price_asc">{t('Price: Low to High')}</option>
                <option value="price_desc">{t('Price: High to Low')}</option>
                <option value="lowest_moq">{t('Lowest MOQ')}</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="p-6 bg-red-950/50 border border-red-500 rounded-2xl text-red-200 my-8">
              <h3 className="font-bold text-lg mb-2">API Connection Failed</h3>
              <p className="font-mono text-xs whitespace-pre-wrap">{error.message}</p>
            </div>
          ) : isLoading ? (
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
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 w-full">
                    {groupedProducts.sponsored.map((p: any) => (
                       <ProductCard key={`sponsored-${p?.id || Math.random()}`} p={p} formatPrice={formatPrice} t={t} isSponsored={true} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              )}

              {isFiltering ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white mb-6">Search Results</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 w-full">
                    {groupedProducts.flatProducts.filter(p => !p.isSponsored).map((p: any) => (
                       <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                </div>
              ) : (
                (() => {
                  const filteredCompanies = groupedProducts.companies.map(group => ({
                    ...group,
                    products: group.products.filter((p: any) => !p.isSponsored && !p.is_sponsored && !p.sponsored && !p.featured)
                  })).filter(group => group.products.length > 0);

                  return filteredCompanies.map((group, idx) => (
                  <div key={idx} className="space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                       <div className="flex items-center gap-4">
                         <Link to={`/company/${group.sellerId}`} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shrink-0 hover:border-cyan-500/50 transition-colors">
                           <Building2 className="w-6 h-6 text-slate-400" />
                         </Link>
                         <div>
                           <Link to={`/company/${group.sellerId}`} className="text-xl font-bold text-white hover:text-cyan-400 transition-colors">{group.companyName}</Link>
                           <p className="text-sm text-slate-500">{group.products.length} product{group.products.length !== 1 ? 's' : ''} in this category</p>
                         </div>
                       </div>
                       <Link
                         to={`/company/${group.sellerId}/listings`}
                         className="flex items-center gap-2 text-sm font-semibold text-cyan-400 border border-cyan-500/30 px-4 py-2 rounded-xl hover:bg-cyan-500/10 hover:border-cyan-400 transition-all shrink-0"
                       >
                         View All Listings →
                       </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 w-full">
                      {group.products.map((p: any) => (
                         <ProductCard key={p?.id || Math.random()} p={p} formatPrice={formatPrice} t={t} onSelect={setSelectedProduct} />
                      ))}
                    </div>
                  </div>
                  ));
                })()
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) }, false)} className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 disabled:opacity-40 hover:border-slate-600 transition-colors">{t('Previous')}</button>
              <span className="text-sm text-slate-400 px-3 tabular-nums">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) }, false)} className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 disabled:opacity-40 hover:border-slate-600 transition-colors">{t('Next')}</button>
            </div>
          )}
        </main>
      </div>
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
