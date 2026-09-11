import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, PackageSearch, Filter, MapPin, Building2, Package, Tag, X, ChevronRight, ChevronLeft, Star, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DigitalSlab } from '../components/DigitalSlab.tsx';
import { useAuth } from '../components/AuthContext.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { cn } from '../components/Layout.tsx';
import { useCurrency } from '../components/CurrencyContext.tsx';
import { LandedCostEstimator } from '../components/LandedCostEstimator.tsx';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const generatePriceTrend = (basePrice: number) => {
  return Array.from({ length: 90 }, (_, i) => {
    const daysAgo = 90 - i;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    const volatility = 0.05;
    const noise = (Math.random() - 0.5) * volatility * basePrice;
    const price = Math.max(0, basePrice + noise + (Math.sin(i / 10) * basePrice * 0.02));
    const quantity = Math.floor(Math.random() * 500) + 50;

    return {
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      price: Number(price.toFixed(2)),
      quantity
    };
  });
};


const CardImageCarousel = ({ images, title }: { images: string[], title: string }) => {
  const [idx, setIdx] = React.useState(0);
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <PackageSearch className="w-10 h-10 text-slate-400" />
      </div>
    );
  }
  
  const handlePrev = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    setIdx(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };
  const handleNext = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    setIdx(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative w-full h-full group overflow-hidden">
      <img src={images[idx]} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      {images.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm opacity-90 hover:opacity-100 transition-all z-10 shadow-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm opacity-90 hover:opacity-100 transition-all z-10 shadow-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5 z-10">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-none ${idx === i ? "bg-slate-800 scale-125" : "bg-slate-800/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: homeProductsData } = useQuery({ queryKey: ["homeProducts"], queryFn: () => fetch("/api-v2/products").then(res => res.json()) });
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ origin: "", category: "", minMoq: "", maxPrice: "", productType: "sealed", sortBy: "newest" });
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  
  const { data: sneakPeekData = [] } = useQuery({
    queryKey: ['sneakPeek', filters.productType],
    queryFn: async () => {
      const res = await fetch(`/api-v2/marketplace/sneak-peek?productType=${filters.productType}`);
      if (!res.ok) throw new Error('Failed to fetch sneak peek');
      return res.json();
    }
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api-v2/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    }
  });

  const { data = {}, isLoading: loading } = useQuery({
    queryKey: ['products', search, page, filters, selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: search,
        page: page.toString(),
        origin: filters.origin,
        minMoq: filters.minMoq,
        maxPrice: filters.maxPrice,
        productType: filters.productType,
        category: selectedCategoryId ? selectedCategoryId.toString() : filters.category,
        sortBy: filters.sortBy
      });
      const res = await fetch(`/api-v2/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    }
  });

// Safely normalize data structures to prevent 'undefined' crashes
  const rawProducts = Array.isArray(data.products) ? data.products : [];
  const products = rawProducts.map((item: any) => ({
    product: item.product || item,
    seller: item.seller || item.product?.seller || {}
  }));

  const rawHomeProducts = Array.isArray(homeProductsData?.products) ? homeProductsData.products : [];
  const homeProducts = rawHomeProducts.map((item: any) => {
    const p = item.product || item;
    return { ...p, seller: item.seller || p.seller || {} };
  });

  const totalPages = data.totalPages || 1;
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: leadsProgress = { sentCount: 0, totalGoal: 20000 } } = useQuery({
    queryKey: ['leadsProgress'],
    queryFn: async () => {
      const res = await fetch('/api-v2/leads/progress');
      if (!res.ok) throw new Error('Failed to fetch leads progress');
      return res.json();
    }
  });

    const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  
  useEffect(() => {
     if (selectedProduct) {
        setSelectedQuantity(selectedProduct.product.moq || 1);
     }
  }, [selectedProduct]);
  
  const formatTiers = (tiers: any) => {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.quantity - b.quantity);
  return sorted.map((tier, idx) => {
    const nextTier = sorted[idx + 1];
    const range = nextTier ? `${tier.quantity}-${nextTier.quantity - 1}` : `${tier.quantity}+`;
    return `${formatPrice(tier.unitPrice)} PPU ${range} units`;
  });
};

  const calculatePrice = () => {
     if (!selectedProduct?.product?.tieredPricing) return null;
     const tiers = selectedProduct.product.tieredPricing as { quantity: number, unitPrice: number }[];
     if (!tiers || tiers.length === 0) return null;
     
     // Sort descending to find highest tier met
     const sorted = [...tiers].sort((a, b) => b.quantity - a.quantity);
     for (const tier of sorted) {
        if (selectedQuantity >= tier.quantity) {
           return tier.unitPrice;
        }
     }
     
     // If below lowest tier but above moq, maybe return the lowest tier price or null
     return sorted[sorted.length - 1].unitPrice;
  };
  
  const currentPrice = calculatePrice();

  const priceTrendData = React.useMemo(() => {
     if (!selectedProduct) return [];
     return generatePriceTrend(Number(selectedProduct.product.unitCost || currentPrice || 10));
  }, [selectedProduct?.product?.id]);

  const { user } = useAuth();
  const { addItem, items: cartItems } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="bg-slate-950 min-h-screen pb-20 flex flex-col">
      <div className="relative overflow-hidden bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="absolute top-0 right-0 p-12 opacity-20 pointer-events-none mix-blend-screen">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-96 h-96 blur-3xl fill-[#ffcc00]">
            <path d="M47.7,-57.2C59.9,-46.8,66.6,-28.9,69.5,-10.8C72.5,7.3,71.6,25.6,63.1,41.2C54.7,56.8,38.6,69.8,20.4,74.9C2.1,79.9,-18.2,77,-34.5,67.6C-50.8,58.3,-63,42.5,-69.1,24.7C-75.2,6.9,-75.1,-12.9,-67.2,-29.4C-59.2,-45.9,-43.3,-59.1,-27.1,-63.9C-10.9,-68.7,5.5,-65.2,19.3,-61.2C33.1,-57.1,44.4,-52.4,47.7,-57.2Z" transform="translate(100 100)" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 p-12 opacity-10 pointer-events-none mix-blend-screen">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-64 h-64 blur-2xl fill-indigo-500">
            <path d="M47.7,-57.2C59.9,-46.8,66.6,-28.9,69.5,-10.8C72.5,7.3,71.6,25.6,63.1,41.2C54.7,56.8,38.6,69.8,20.4,74.9C2.1,79.9,-18.2,77,-34.5,67.6C-50.8,58.3,-63,42.5,-69.1,24.7C-75.2,6.9,-75.1,-12.9,-67.2,-29.4C-59.2,-45.9,-43.3,-59.1,-27.1,-63.9C-10.9,-68.7,5.5,-65.2,19.3,-61.2C33.1,-57.1,44.4,-52.4,47.7,-57.2Z" transform="translate(100 100)" />
          </svg>
        </div>
        <div className="relative p-10 md:p-20 max-w-4xl mx-auto flex flex-col space-y-8 z-10">
          
          {/* Centered Text & Branding */}
          <div className="text-center space-y-6">
            <img src="/logo.png" alt="Hatake" className="h-24 md:h-32 mx-auto object-contain rounded-full shadow-lg shadow-white/10" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
              {t('Next-Generation')} <br/><span className="text-[#ffcc00] drop-shadow-sm">{t('B2B TCG Sourcing')}</span>
            </h1>
            <p className="text-xl text-slate-400 font-sans max-w-2xl mx-auto font-light leading-relaxed">
              {t('Discover verified suppliers, negotiate MOQ deals, and source directly from top manufacturers.')}
            </p>
          </div>

          {/* Reference Site Inspired Banner */}
          <div className="w-full bg-slate-900 border-y border-slate-800 py-3 mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-2">
              <div className="flex flex-col items-center justify-center gap-1 text-sm">
                <span className="flex items-center gap-1.5 text-[#ffcc00] font-bold text-xs uppercase tracking-widest">
                  <Users className="w-3.5 h-3.5" /> Launch Network
                </span>
                <span className="text-slate-400 text-xs font-medium">
                  {t('Inviting up to')} <span className="text-white font-bold">50 TCG companies/day</span>
                </span>
                <span className="text-xs font-bold text-[#ffcc00] whitespace-nowrap mt-1">
                  {leadsProgress.sentCount.toLocaleString()} / {leadsProgress.totalGoal.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-3 w-full max-w-md mt-1">
                <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                  <div className="bg-[#ffcc00] h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${Math.max(5, Math.min(100, (leadsProgress.sentCount / leadsProgress.totalGoal) * 100))}%` }}>
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            
          {/* Centered Search */}
          <div className="flex flex-col items-center space-y-4 w-full mt-8">
            <form onSubmit={handleSearch} className="flex w-full max-w-md bg-slate-800/80 border border-slate-700 p-2 flex-col sm:flex-row gap-2 shadow-lg backdrop-blur-xl relative z-10 rounded-2xl hover:border-slate-600 transition-colors">
              <div className="relative flex-1 flex items-center">
                <SearchIcon className="absolute left-5 text-slate-400 w-5 h-5 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('Search products...')}
                  className="w-full px-12 text-center bg-transparent text-white placeholder-slate-400 shadow-none focus:ring-0 focus:outline-none border-transparent h-12"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-cyan-500 text-slate-900 hover:bg-cyan-400 font-bold px-6 py-2.5 rounded-xl transition-colors shadow-none w-full sm:w-auto">
                Search
              </button>
            </form>
          </div>

            {/* Sponsored Products */}
            <div className="w-full max-w-3xl mt-12 pt-8 animate-in fade-in">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('Sponsored Products')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
{homeProducts.filter((p: any) => p.isSponsored).slice(0, 3).map((sp: any, idx: number) => (                  <div key={idx} onClick={() => navigate('/marketplace')} className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col gap-3 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-900/20 transition-all cursor-pointer">
                    <img src={sp.images?.[0] || "https://images.unsplash.com/photo-1615592389070-bcc97e05ad01?auto=format&fit=crop&w=400&q=80"} alt={sp.title} className="w-full h-32 object-cover rounded-md border border-slate-800" />
                    <div>
                      <h4 className="font-semibold text-slate-200 text-sm truncate">{sp.title}</h4>
                      <p className="text-xs text-slate-400 truncate">{sp.companyName || sp.brand || 'Premium Vendor'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      <span className="bg-cyan-500/20 text-cyan-400 rounded-md text-[10px] py-0.5 px-1.5 font-medium border border-cyan-900/50">{sp.originType || 'Factory'}</span>
                      <span className="bg-slate-800 text-slate-400 rounded-md text-[10px] py-0.5 px-1.5 font-medium border border-slate-700">MOQ: {sp.moq || 'Negotiable'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          <div className="mt-10 pt-8 border-t border-slate-700/50 max-w-5xl mx-auto flex flex-col items-center text-left gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
               <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-6 shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="p-2 bg-cyan-500/10 rounded-lg">
                     <Package className="w-5 h-5 text-cyan-400" />
                   </div>
                   <h3 className="text-lg font-bold text-cyan-300">{t('Empowering Global B2B Trade at Any Scale')}</h3>
                 </div>
                 <p className="text-slate-400 text-sm leading-relaxed">
                   {t('Whether you are sourcing multi-tonne shipments for custom white-label manufacturing, or procuring smaller volumes of established, ready-to-ship brands, Hatake.Shop bridges the gap. Designed to empower vendors of all sizes—allowing you to seamlessly procure goods at massive scale, or distribute your existing inventory to a global network of buyers.')}
                 </p>
               </div>
               <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-6 shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="p-2 bg-cyan-500/10 rounded-lg">
                     <Users className="w-5 h-5 text-cyan-400" />
                   </div>
                   <h3 className="text-lg font-bold text-cyan-300">{t('Scaling the Verified Vendor Network Daily')}</h3>
                 </div>
                 <p className="text-slate-400 text-sm leading-relaxed">
                   {t('Our relentless B2B outreach engine actively onboards up to 50 TCG companies per day. This aggressive expansion guarantees our marketplace consistently delivers a massive influx of fresh inventory, driving highly competitive wholesale pricing and continually connecting new buyers with our network of approved sellers.')}
                 </p>
               </div>
             </div>
             
             <div className="flex gap-4 flex-col sm:flex-row w-full justify-center mt-4">
                <div className="bg-slate-800/80 border border-slate-700 px-4 py-3 flex items-center gap-3 w-full max-w-[240px] justify-center backdrop-blur-sm rounded-2xl shadow-lg">
                   <div className="p-2 bg-slate-900 text-slate-400 rounded-xl border border-slate-700/50"><Package className="w-5 h-5" /></div>
                   <div>
                     <div className="font-semibold tracking-tight text-slate-200 text-sm">{t('Wholesale OEM')}</div>
                     <div className="text-xs text-slate-400 font-medium">{t('Tonnes & Containers')}</div>
                   </div>
                </div>
                <div className="bg-slate-800/80 border border-slate-700 px-4 py-3 flex items-center gap-3 w-full max-w-[240px] justify-center backdrop-blur-sm rounded-2xl shadow-lg">
                   <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-900/50 rounded-xl"><Tag className="w-5 h-5" /></div>
                   <div>
                     <div className="font-semibold tracking-tight text-slate-200 text-sm">{t('Retail Stock')}</div>
                     <div className="text-xs text-slate-400 font-medium">{t('Low Volume Brands')}</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-12 space-y-12 flex-1">
        {!selectedCategoryId && !search ? (
          <div className="space-y-16">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <h2 className="heading-xl">{t('Featured Categories')}</h2>
            </div>
          {sneakPeekData.map((dataItem: any, idx: number) => (
            <div key={idx} className="space-y-6">
              <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-200">{dataItem.category.name}</h3>
                  <div className="flex flex-wrap gap-2.5 mt-3">
                    {dataItem.subcategories.map((sub: any) => (
                      <button 
                        key={sub.id} 
                        onClick={() => { setSelectedCategoryId(sub.id); setSearch(""); setPage(1); }} 
                        className="group flex items-center text-[13px] bg-slate-900 border border-slate-800 text-slate-400 px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 hover:bg-slate-800 hover:border-slate-700 hover:text-white active:scale-95"
                      >
                        <span className="text-cyan-500/70 group-hover:text-cyan-400 mr-1.5 font-semibold tracking-tight">#</span>
                        {sub.name}
                        <span className="ml-2 text-[11px] font-semibold tracking-tight bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-700 px-1.5 py-0.5 rounded-lg transition-colors">{sub.productCount || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {(!dataItem.groups || dataItem.groups.length === 0) ? (
                 <div className="text-slate-400 text-sm py-4">{t('No products listed in this category yet.')}</div>
              ) : (
                <div className="space-y-8">
                  {dataItem.groups.map((group: any, gIdx: number) => (
                    <div key={gIdx} className="mb-8 border-b border-slate-800 pb-8 last:border-0 last:mb-0 last:pb-0">
                      {group.seller && (
                        <h4 className="text-md font-semibold tracking-tight text-slate-400 mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                          {t('Top Listings from')} {group.seller.companyName}
                        </h4>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 justify-center place-items-center">
                        {group.products.map(({ product, seller }: any) => (
                          <div key={product.id} onClick={() => {
                              setSelectedProduct({ product, seller });
                              setActiveImageIndex(0);
                          }} className="group bg-slate-800 border border-slate-700 rounded-2xl p-0 overflow-hidden hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-900/10 transition-all duration-300 cursor-pointer flex flex-col h-full w-full max-w-sm mx-auto">
                      <div className="relative aspect-[4/3] bg-slate-800 overflow-hidden">
                        
                        {product.productType === 'graded' ? (
                          <div className="w-full h-full p-2 bg-slate-800">
                            <DigitalSlab 
                              company={product.gradingCompany}
                              grade={product.grade}
                              certNumber={product.certNumber}
                              cardName={product.title}
                              cardSet={product.cardSet}
                              cardNumber={product.cardNumber}
                              year={product.cardYear}
                              variant={product.cardVariant}
                              image={product.images && product.images.length > 0 ? product.images[0] : undefined}
                            />
                          </div>
                        ) : (
                          <CardImageCarousel images={product.images} title={product.title} />
                        )}

                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <span className="px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-slate-200 text-[10px] uppercase font-semibold tracking-tight rounded-full shadow-sm border border-slate-700">
                            {t('MOQ')}: {product.moq}
                          </span>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        
                        <h3 className="font-semibold tracking-tight text-slate-200 line-clamp-1 mb-1 group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                          <span className="line-clamp-1">{product.title}</span>
                          {product.productType === 'graded' && <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold tracking-tight uppercase rounded-full shrink-0">{t('Graded')}</span>}
                        </h3>
                        {product.productType === 'graded' && <div className="text-[10px] font-semibold tracking-tight text-slate-400 mb-1">{product.gradingCompany} {product.grade} • Cert: {product.certNumber || 'N/A'}</div>}

                        <div className="flex items-center text-xs font-medium text-slate-400 mb-4">
                          <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <Link to={`/company/${seller?.id || ""}`} onClick={(e) => e.stopPropagation()} className="truncate hover:text-cyan-400 transition-colors">{seller?.companyName || "Supplier"}</Link>
                          {seller?.verificationStatus === 'verified' && <BadgeCheck className="w-3.5 h-3.5 ml-1 text-cyan-500" />}
                        </div>
                        <div className="mt-auto flex items-end justify-between">
                          <div>
                            <div className="text-[10px] font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-0.5">{t('Wholesale')}</div>
                            {formatTiers(product.tieredPricing) ? (
                              <div className="flex flex-col gap-0.5">
                                {formatTiers(product.tieredPricing).map((t: string, i: number) => (
                                  <div key={i} className="text-[13px] font-semibold tracking-tight text-slate-200">{t}</div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-lg font-semibold tracking-tight font-display text-slate-200">{t('Negotiable')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                        <Link to={`/company/${group.seller.id}`} onClick={() => window.scrollTo(0, 0)} className="group bg-slate-900/50 rounded-2xl border border-slate-800/60 overflow-hidden hover:border-cyan-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-900/20 transition-all duration-300 flex flex-col items-center justify-center h-full min-h-[250px] text-center p-6 cursor-pointer">
                           <div className="w-14 h-14 rounded-full bg-slate-800 shadow-none text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all duration-300 border border-slate-700 group-hover:border-transparent">
                              <ChevronRight className="w-7 h-7 ml-1" />
                           </div>
                           <span className="font-semibold tracking-tight text-slate-200 group-hover:text-cyan-400 mb-1 transition-colors">{t('View all listings')}</span>
                           <span className="text-xs font-medium text-slate-400">from {group.seller.companyName}</span>
                        </Link>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
<>


      <div className="flex flex-col items-center justify-center gap-4 w-full text-center mb-6">
        <div className="flex flex-col items-center gap-3">
          <h2 className="heading-xl">{selectedCategoryId ? categoriesData.find((c:any)=>c.id===selectedCategoryId)?.name : (search ? 'Search Results' : 'Featured Products')}</h2>
    {selectedCategoryId && (
       <button onClick={() => setSelectedCategoryId(null)} className="bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl px-3 py-1 text-sm font-medium transition-colors border border-slate-700">
         Clear Category
       </button>
    )}
  </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn("flex items-center space-x-2 text-sm font-semibold tracking-tight px-5 py-2.5 rounded-xl transition-all active:scale-95", showFilters ? "bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20" : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white")}>
          <Filter className="w-4 h-4" />
          <span>{t('Filter Results')}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {showFilters && (
          <div className="w-full md:w-64 shrink-0 space-y-6">
             <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg">
                
                <div>
                   <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-2">{t('Category')}</label>
                   <select 
                     value={selectedCategoryId || ''} 
                     onChange={e => { setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null); setPage(1); }}
                     className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 w-full text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                   >
                      <option value="">{t('All Categories')}</option>
                      {categoriesData.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-2">{t('Sort By')}</label>
                   <select 
                     value={filters.sortBy} 
                     onChange={e => { setFilters(f => ({ ...f, sortBy: e.target.value })); setPage(1); }}
                     className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 w-full text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                   >
                      <option value="newest">{t('Newest First')}</option>
                      <option value="randomized">{t('Randomized Sellers')}</option>
                      <option value="lowest_moq">{t('Lowest MOQ')}</option>
                      <option value="lowest_price">{t('Lowest Price')}</option>
                      <option value="highest_price">{t('Highest Price')}</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-2">{t('Origin')}</label>
                   <select 
                     value={filters.origin} 
                     onChange={e => { setFilters(f => ({ ...f, origin: e.target.value })); setPage(1); }}
                     className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 w-full text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                   >
                      <option value="">{t('Any Origin')}</option>
                      <option value="Direct Factory">{t('Direct Factory')}</option>
                      <option value="Verified EU Carrier/Warehouse">{t('EU Warehouse')}</option>
                      <option value="Global Distributor">{t('Global Distributor')}</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-2">{t('Max MOQ')}</label>
                   <select 
                     value={filters.minMoq} 
                     onChange={e => { setFilters(f => ({ ...f, minMoq: e.target.value })); setPage(1); }}
                     className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-4 py-2 w-full text-sm font-medium appearance-none outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                   >
                      <option value="">{t('Any MOQ')}</option>
                      <option value="10">{t('Under 10')}</option>
                      <option value="100">{t('Under 100')}</option>
                      <option value="1000">{t('Under 1000')}</option>
                   </select>
                </div>
                <button 
                  onClick={() => { setFilters({ origin: "", category: "", minMoq: "", maxPrice: "", productType: filters.productType, sortBy: "newest" }); setPage(1); }}
                  className="w-full py-2 text-sm font-medium rounded-xl bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors mt-2"
                >
                  Clear Filters
                </button>
             </div>
          </div>
        )}
        <div className="flex-1">

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('Loading catalog...')}</div>
      ) : products.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 text-center py-12 text-slate-400">{t('No products found.')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-center place-items-center">
          {(Array.isArray(products) ? products : []).map((p, i) => (
            <div 
              key={p.product.id || i} 
              className="group bg-slate-800 border border-slate-700 rounded-2xl p-0 overflow-hidden hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-900/10 transition-all duration-300 cursor-pointer flex flex-col h-full w-full max-w-sm mx-auto"
              onClick={() => { setSelectedProduct(p); setActiveImageIndex(0); }}
            >
              <div className="aspect-[4/3] bg-slate-800 flex items-center justify-center overflow-hidden relative">
                
                {p.product.productType === 'graded' ? (
                  <div className="w-full h-full p-2 bg-slate-800">
                    <DigitalSlab 
                      company={p.product.gradingCompany}
                      grade={p.product.grade}
                      certNumber={p.product.certNumber}
                      cardName={p.product.title}
                      cardSet={p.product.cardSet}
                      cardNumber={p.product.cardNumber}
                      year={p.product.cardYear}
                      variant={p.product.cardVariant}
                      image={p.product.images && p.product.images.length > 0 ? p.product.images[0] : undefined}
                    />
                  </div>
                ) : (
                  <CardImageCarousel images={p.product.images} title={p.product.title} />
                )}

                {p.product.originType && (
                  <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-tight text-slate-400 uppercase tracking-wide border border-slate-700 shadow-none">
                    {p.product.originType}
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold tracking-tight text-slate-200 leading-tight group-hover:text-cyan-400 transition-colors line-clamp-2">{p.product.title}</h3>
                </div>
                {p.product.productType === 'graded' && <div className="text-xs font-semibold tracking-tight text-slate-400 mb-2">{p.product.gradingCompany} {p.product.grade} • Cert: {p.product.certNumber || 'N/A'}</div>}
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 font-light">{p.product.description}</p>
                
                <div className="mt-auto space-y-4">
                  <div className="flex items-center text-xs font-semibold text-slate-400 bg-slate-800/50 rounded-xl p-2.5 border border-slate-700">
                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                    <Link to={`/company/${p.seller?.id || ""}`} onClick={(e) => e.stopPropagation()} className="truncate hover:text-cyan-400 transition-colors">{p.seller?.companyName || "Supplier"}</Link>{p.seller?.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 ml-1.5 text-cyan-500" />}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-1.5 text-slate-400" />
                      {t('MOQ')}: {p.product.moq}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[100px]">{p.seller?.country || 'Global'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-semibold tracking-tight uppercase tracking-wider">{t('Pricing')}</span>
                      <span className="text-sm font-semibold tracking-tight text-slate-200">
                        {formatTiers(p.product.tieredPricing) ? (
                          <div className="flex flex-col gap-0.5">
                            {formatTiers(p.product.tieredPricing).map((t: string, i: number) => (
                              <div key={i} className="text-[12px] leading-tight font-semibold tracking-tight text-slate-200">{t}</div>
                            ))}
                          </div>
                        ) : 'Negotiable'}
                      </span>
                    </div>
                    {user ? (
                       <Link to="/rfq" state={{ productId: p.product.id, title: p.product.title }} className="bg-cyan-500 text-slate-900 hover:bg-cyan-400 font-medium px-4 py-2 rounded-xl text-sm transition-colors">
                         Quote
                       </Link>
                    ) : (
                       <button className="px-4 py-2 bg-slate-800 text-slate-400 cursor-not-allowed text-sm font-semibold tracking-tight rounded-xl border border-slate-700">
                         Sign in
                       </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 transition-colors px-4 py-2 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-400"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400 font-medium">Page {page} of {totalPages}</span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl border border-slate-700 transition-colors px-4 py-2 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-400"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

</>
      )}
      </div>
      {selectedProduct && (
        <div 
           className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
           onClick={() => setSelectedProduct(null)}
        >
          <div 
             className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-slate-700"
             onClick={(e) => e.stopPropagation()}
          >
            <div className="md:w-1/2 h-64 md:h-auto bg-slate-950 flex flex-col relative">
              <div className="flex-1 flex items-center justify-center relative group">
                {selectedProduct.product.productType === 'graded' ? (
                  <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-900">
                    <div className="w-full h-full max-h-[500px] max-w-[350px]">
                      <DigitalSlab 
                        company={selectedProduct.product.gradingCompany}
                        grade={selectedProduct.product.grade}
                        certNumber={selectedProduct.product.certNumber}
                        cardName={selectedProduct.product.title}
                        cardSet={selectedProduct.product.cardSet}
                        cardNumber={selectedProduct.product.cardNumber}
                        year={selectedProduct.product.cardYear}
                        variant={selectedProduct.product.cardVariant}
                        image={selectedProduct.product.images && selectedProduct.product.images.length > 0 ? selectedProduct.product.images[activeImageIndex] : undefined}
                      />
                    </div>
                    {selectedProduct.product.images && selectedProduct.product.images.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev: number) => (prev > 0 ? prev - 1 : selectedProduct.product.images.length - 1)); }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 shadow-none transition-all z-10"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev: number) => (prev < selectedProduct.product.images.length - 1 ? prev + 1 : 0)); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 shadow-none transition-all z-10"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-y-1/2 flex gap-1.5 z-10">
                          {selectedProduct.product.images.map((_: any, i: number) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i === activeImageIndex ? 'bg-cyan-500' : 'bg-slate-600'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : selectedProduct.product.images && selectedProduct.product.images.length > 0 ? (
                  <>
                    <img 
                      src={selectedProduct.product.images[activeImageIndex]} 
                      alt={selectedProduct.product.title} 
                      className="w-full h-full object-cover absolute inset-0 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                    {selectedProduct.product.images.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev: number) => (prev > 0 ? prev - 1 : selectedProduct.product.images.length - 1)); }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/40 hover:bg-slate-900/80 text-white p-2 rounded-full backdrop-blur-md opacity-90 hover:opacity-100 transition-all z-20"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev: number) => (prev < selectedProduct.product.images.length - 1 ? prev + 1 : 0)); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/40 hover:bg-slate-900/80 text-white p-2 rounded-full backdrop-blur-md opacity-90 hover:opacity-100 transition-all z-20"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-3 z-10">
                          {(Array.isArray(selectedProduct.product.images) ? selectedProduct.product.images : []).map((_: any, idx: number) => (
                            <button 
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); setActiveImageIndex(idx); }}
                              className={cn("w-2.5 h-2.5 rounded-full transition-all duration-300 shadow-none", activeImageIndex === idx ? "bg-cyan-500 scale-125" : "bg-slate-500/50 hover:bg-slate-400")}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <PackageSearch className="w-24 h-24 text-slate-400" />
                )}
              </div>
            </div>
            
            <div className="md:w-1/2 flex flex-col max-h-[60vh] md:max-h-[90vh] overflow-y-auto bg-slate-900">
              <div className="p-8 border-b border-slate-800 flex justify-between items-start sticky top-0 bg-slate-900/95 backdrop-blur-xl z-20">
                <div className="pr-4">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-100 mb-2">{selectedProduct.product.title}</h2>
                  <div className="flex items-center text-sm font-medium text-slate-400">
                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                    <Link to={`/company/${selectedProduct.seller?.id || ""}`} className="hover:text-cyan-400 transition-colors">{selectedProduct.seller?.companyName || "Supplier"}</Link>{selectedProduct.seller?.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 ml-1.5 text-cyan-500" />}
                  </div>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-2.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-full transition-all active:scale-95 border border-slate-700 shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                <div>
                  <h3 className="text-[11px] font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-3">{t('Description')}</h3>
                  <p className="text-slate-400 whitespace-pre-line leading-relaxed font-light text-[15px]">{selectedProduct.product.description}</p>
                </div>
                
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <h3 className="text-[11px] font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-4">{t('Sourcing Details')}</h3>
                  <div className="space-y-4 text-[15px]">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                      <span className="text-slate-400">{t('Primary Origin')}</span>
                      <span className="font-semibold text-slate-200 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700/50 shadow-none">{selectedProduct.product.originType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                      <span className="text-slate-400">{t('Base MOQ')}</span>
                      <span className="font-semibold text-slate-200">{selectedProduct.product.moq} units</span>
                    </div>
                                        <div className="flex justify-between items-center">
                      <span className="text-slate-400">{t('Lead Time')}</span>
                      <span className="font-semibold text-slate-200">{selectedProduct.product.leadTimeDays} days</span>
                    </div>
                    {selectedProduct.product.certifications && selectedProduct.product.certifications.length > 0 && (
                      <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                        <span className="text-slate-400">{t('Certifications')}</span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {selectedProduct.product.certifications.map((c: string, i: number) => (
                            <span key={i} className="text-xs font-semibold tracking-tight text-cyan-600 bg-cyan-950 px-2 py-1 rounded border border-cyan-900">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 mb-8">
                   <h3 className="text-[11px] font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-4">{t('90-Day Wholesale Price Trend')}</h3>
                   <div className="h-64 w-full bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={priceTrendData}>
                           <defs>
                              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                 <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                           <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={30} />
                           <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => formatPrice(val)} domain={['auto', 'auto']} />
                           <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                           <Tooltip 
                             contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             formatter={(value: number, name: string) => [name === 'price' ? formatPrice(value) : `${value} units`, name === 'price' ? 'Price' : 'Purchased Qty']}
                           />
                           <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}/>
                           <Area yAxisId="left" type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2} fill="url(#colorPrice)" name="price" />
                           <Line yAxisId="right" type="monotone" dataKey="quantity" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" name="quantity" dot={false} />
                        </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {selectedProduct.product.shippingOptions && selectedProduct.product.shippingOptions.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-4">{t('Logistics Options')}</h3>
                    <div className="space-y-3">
                      {(Array.isArray(selectedProduct.product.shippingOptions) ? selectedProduct.product.shippingOptions : []).map((opt: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-slate-800 p-4 rounded-xl border border-slate-700/60 shadow-none">
                          <span className="text-slate-400"><span className="font-semibold tracking-tight text-slate-200">{opt.type}</span> in {opt.country}</span>
                          <span className="font-semibold text-cyan-400 bg-slate-900 px-2 py-1 rounded-lg text-xs border border-slate-800">{t('MOQ')}: {opt.moq}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedProduct.product.tieredPricing && (
                  <div className="pt-2">
                    <h3 className="text-[11px] font-semibold tracking-tight text-slate-400 uppercase tracking-widest mb-4">{t('Volume Pricing')}</h3>
                    
                    <div className="flex justify-between items-end mb-4 bg-slate-800/50 p-5 rounded-2xl border border-cyan-900/50">
                       <span className="text-slate-400 font-medium">{selectedQuantity} Units</span>
                       <div className="text-right">
                          <div className="text-3xl font-semibold tracking-tight font-display text-cyan-400">{currentPrice ? formatPrice(currentPrice) : '--'}</div>
                          <div className="text-[10px] text-cyan-500/80 uppercase tracking-widest font-semibold tracking-tight mt-1">{t('per unit')}</div>
                       </div>
                    </div>
                    
                    <input 
                      type="range" 
                      min={1} 
                      max={5000} 
                      step={1}
                      value={selectedQuantity}
                      onChange={e => setSelectedQuantity(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-xl appearance-none cursor-pointer accent-cyan-500"
                    />
                    
                    <div className="mt-4 flex justify-between text-sm">
                       <span className="text-slate-400 font-medium">{t('Estimated Total')}: <span className="text-slate-200 font-semibold tracking-tight font-display ml-1">{currentPrice ? formatPrice(currentPrice * selectedQuantity) : '--'}</span></span>
                    </div>
                  </div>
                )}
                
                <div className="pt-4">
                  <LandedCostEstimator quantity={selectedQuantity} currentPrice={currentPrice} />
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                   <span className="text-[10px] font-semibold tracking-tight text-slate-400 uppercase tracking-widest block mb-0.5">{t('Wholesale Pricing')}</span>
                   {formatTiers(selectedProduct.product.tieredPricing) ? (
                          <div className="flex flex-col gap-1 mt-1">
                            {formatTiers(selectedProduct.product.tieredPricing).map((t: string, i: number) => (
                              <div key={i} className="text-lg font-semibold tracking-tight font-display text-slate-200">{t}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xl font-semibold tracking-tight font-display text-slate-200">{t('Negotiable')}</span>
                        )}
                </div>
                {user ? (
                   <div className="flex gap-3 w-full md:w-auto">
                     <button 
                       onClick={() => addItem({
                         productId: selectedProduct.product.id,
                         title: selectedProduct.product.title,
                         image: selectedProduct.product.images?.[0] || '',
                         supplierName: selectedProduct.seller?.companyName || 'Supplier',
                         supplierId: selectedProduct.seller?.id
                       })}
                       className="bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl px-6 py-3.5 shadow-none flex items-center justify-center font-medium transition-colors w-full md:w-auto"
                     >
                       {cartItems.find(i => i.productId === selectedProduct.product.id) ? 'Sample in Cart' : t('Request Sample')}
                     </button>
                     <Link to="/rfq" state={{ productId: selectedProduct.product.id, title: selectedProduct.product.title }} className="bg-cyan-500 text-slate-900 hover:bg-cyan-400 font-bold px-8 py-3.5 shadow-none rounded-xl text-center w-full md:w-auto transition-colors">
                       {t('Start Request for Quote')}
                     </Link>
                   </div>
                ) : (
                   <button className="px-8 py-3.5 bg-slate-800 text-slate-400 cursor-not-allowed text-sm font-semibold tracking-tight rounded-xl border border-slate-700 w-full md:w-auto">
                     Sign in to Quote
                   </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  )
}