import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  PackageSearch,
  MapPin,
  Building2,
  Package,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Store,
  Bot,
  Search,
  SlidersHorizontal,
  Layers,
  ShoppingBag,
  Sparkles,
  Truck,
  ShieldCheck,
  ArrowUpRight,
  LayoutGrid,
  Rows3,
  Globe2,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuickSearchResults } from '../components/QuickSearchResults.tsx';
import { DigitalSlab } from '../components/DigitalSlab.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { useCurrency } from '../components/CurrencyProvider.tsx';
import { useSiteMode } from '../components/SiteModeContext.tsx';
import { useTheme } from '../components/ThemeContext.tsx';
import { ProductModal } from '../components/ProductModal.tsx';
import { BrowseSections } from '../components/BrowseSections.tsx';
import { SkeletonGrid } from '../components/SkeletonGrid.tsx';
import { SafeImage, optimizeImageUrl } from '../components/SafeImage.tsx';
import { PRODUCT_LANGUAGES, languageLabel } from '../lib/productTaxonomy.ts';

const CardImageCarousel = ({ images, title }: { images: string[]; title: string }) => {
  const [idx, setIdx] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950/90">
        <PackageSearch className="w-10 h-10 text-slate-700" />
      </div>
    );
  }

  const safeIdx = idx < images.length ? idx : 0;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || images.length <= 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) > 35) {
      e.stopPropagation();
      if (deltaX < 0) setIdx((prev) => (prev + 1) % images.length);
      else setIdx((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full group overflow-hidden bg-gradient-to-b from-slate-800/30 via-slate-900/70 to-slate-950 flex items-center justify-center"
    >
      <SafeImage
        src={optimizeImageUrl(images[safeIdx], 500)}
        alt={title}
        fallbackIcon={<PackageSearch className="w-10 h-10 text-slate-600" />}
        className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={handlePrev}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={handleNext}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1 z-10 pointer-events-none">
            {images.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  safeIdx === i ? 'w-4 bg-indigo-400' : 'w-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export function Home() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const { switchSiteMode, b2cHref } = useSiteMode();
  const { isLight } = useTheme();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'sections'>('grid');
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [filters, setFilters] = useState({
    origin: '',
    category: '',
    minMoq: '',
    maxPrice: '',
    productType: 'all',
    sortBy: 'recommended',
  });

  useEffect(() => {
    const h = setTimeout(() => {
      const v = searchInput.trim();
      setSearch(v.length >= 2 ? v : '');
      setPage(1);
    }, 240);
    return () => clearTimeout(h);
  }, [searchInput]);

  const { data: browseData = { categories: [], companies: [] } } = useQuery({
    queryKey: ['browse', filters.productType],
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api-v2/marketplace/browse?productType=${encodeURIComponent(filters.productType)}`
        );
        return res.ok ? await res.json() : { categories: [], companies: [] };
      } catch {
        return { categories: [], companies: [] };
      }
    },
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await fetch('/api-v2/categories');
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    },
  });

  const { data = {}, isLoading: loading, isFetching } = useQuery({
    queryKey: ['products', search, page, filters, selectedCategoryId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          q: search,
          page: page.toString(),
          origin: filters.origin,
          minMoq: filters.minMoq,
          maxPrice: filters.maxPrice,
          productType: filters.productType,
          category: selectedCategoryId ? selectedCategoryId.toString() : filters.category,
          sortBy: filters.sortBy,
        });
        const res = await fetch(`/api-v2/products?${params.toString()}`);
        const json = await res.json();
        return json && Array.isArray(json.products) ? json : { products: [], totalPages: 1 };
      } catch {
        return { products: [], totalPages: 1 };
      }
    },
  });

  const rawProducts = Array.isArray((data as any).products) ? (data as any).products : [];
  const currentPageProducts = useMemo(
    () =>
      rawProducts.map((item: any) => ({
        product: item.product || item,
        seller: item.seller || item.product?.seller || {},
      })),
    [rawProducts]
  );

  // Accumulate products downwards as pages are loaded (infinite scroll / load more downwards)
  const [accumulatedProducts, setAccumulatedProducts] = useState<any[]>([]);

  useEffect(() => {
    setPage(1);
    setAccumulatedProducts([]);
  }, [
    search,
    selectedCategoryId,
    filters.origin,
    filters.minMoq,
    filters.maxPrice,
    filters.productType,
    filters.sortBy,
  ]);

  useEffect(() => {
    if (loading) return;
    if (page === 1) {
      setAccumulatedProducts(currentPageProducts);
    } else if (currentPageProducts.length > 0) {
      setAccumulatedProducts((prev) => {
        const existingIds = new Set(prev.map((x) => x.product?.id));
        const nextItems = currentPageProducts.filter((x: any) => !existingIds.has(x.product?.id));
        return [...prev, ...nextItems];
      });
    }
  }, [currentPageProducts, page, loading]);

  const products = accumulatedProducts.length > 0 ? accumulatedProducts : currentPageProducts;

  const totalPages = (data as any).totalPages || 1;
  const totalCount = (data as any).totalCount || (data as any).total || products.length;

  const sortedCategories = useMemo(() => {
    const cats = browseData?.categories || [];
    return [...cats].filter((c: any) => (c.productCount || c.products?.length || 0) > 0);
  }, [browseData?.categories]);

  const formatTiers = (tiers: any): string[] | null => {
    let parsedTiers = tiers;
    if (typeof tiers === 'string') {
      try {
        parsedTiers = JSON.parse(tiers);
      } catch {
        parsedTiers = [];
      }
    }
    if (!Array.isArray(parsedTiers) || parsedTiers.length === 0) return null;
    const sorted = [...parsedTiers].sort(
      (a, b) => (a.quantity ?? a.minQty ?? 0) - (b.quantity ?? b.minQty ?? 0)
    );
    return sorted.map((tier, idx) => {
      const nextTier = sorted[idx + 1];
      const qty = tier.quantity ?? tier.minQty ?? 0;
      const range = nextTier ? `${qty}–${(nextTier.quantity ?? nextTier.minQty ?? 0) - 1}` : `${qty}+`;
      const tierPrice = Number(tier.price ?? tier.unitPrice ?? 0);
      return `${formatPrice(tierPrice)} / ${t('st')} (${range})`;
    });
  };

  const lowestUnitPrice = (product: any): number | null => {
    let tiers: any = product?.tieredPricing;
    if (typeof tiers === 'string') {
      try {
        tiers = JSON.parse(tiers);
      } catch {
        tiers = [];
      }
    }
    if (Array.isArray(tiers) && tiers.length > 0) {
      const prices = tiers
        .map((tier: any) => Number(tier.price ?? tier.unitPrice))
        .filter((n: number) => Number.isFinite(n) && n > 0);
      if (prices.length > 0) return Math.min(...prices);
    }
    const base = Number(product?.unitCost ?? product?.unitPrice);
    return Number.isFinite(base) && base > 0 ? base : null;
  };

  const handleQuickAddB2bCart = (product: any, seller: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let images: string[] = [];
    try {
      images = Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]');
    } catch {}
    const unitCost = lowestUnitPrice(product) || Number(product.unitCost) || 10;
    addItem({
      productId: product.id,
      title: product.title,
      image: images[0] || '',
      sellerId: seller?.id || product.sellerId || 1,
      sellerName: seller?.companyName || product.brand || 'Verified Supplier',
      moq: Number(product.moq) || 1,
      unitCost,
      quantity: Math.max(1, Number(product.moq) || 1),
    });
    toast.success(`${t('Tillagd i B2B RFQ / Sample-korg')}: ${product.title}`);
  };

  const activeFilterCount =
    (selectedCategoryId !== null ? 1 : 0) +
    (filters.origin ? 1 : 0) +
    (filters.minMoq ? 1 : 0) +
    (filters.productType !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedCategoryId(null);
    setFilters({
      origin: '',
      category: '',
      minMoq: '',
      maxPrice: '',
      productType: 'all',
      sortBy: 'recommended',
    });
    setPage(1);
  };

  const renderB2bCard = (item: any, idx: number) => {
    const product = item.product || item;
    const seller = item.seller || product.seller || {};
    let images: string[] = [];
    try {
      images = Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]');
    } catch {}
    const tiers = formatTiers(product.tieredPricing);
    const minPrice = lowestUnitPrice(product);
    const langMeta = product.language
      ? PRODUCT_LANGUAGES.find((x) => x.value === product.language)
      : null;

    return (
      <motion.article
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(idx * 0.025, 0.25) }}
        whileHover={{ y: -5 }}
        key={product.id || idx}
        onClick={() => setSelectedProduct({ product, seller })}
        className="group bg-slate-900/90 backdrop-blur-md border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-colors duration-300 hover:shadow-2xl hover:shadow-indigo-950/40 h-full w-full"
      >
        {/* Image Stage */}
        <div className="relative aspect-square w-full border-b border-slate-800/80 overflow-hidden">
          {product.productType === 'graded' ? (
            <div className="w-full h-full p-2 bg-slate-900">
              <DigitalSlab
                company={product.gradingCompany}
                grade={product.grade}
                certNumber={product.certNumber}
                cardName={product.title}
                cardSet={product.cardSet}
                cardNumber={product.cardNumber}
                year={product.cardYear}
                variant={product.cardVariant}
                image={images.length > 0 ? images[0] : undefined}
              />
            </div>
          ) : (
            <CardImageCarousel images={images} title={product.title} />
          )}

          {/* Top-left MOQ & OEM Badges */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
            <span className="px-2.5 py-0.5 bg-slate-950/90 backdrop-blur-md text-slate-100 text-[10px] uppercase font-extrabold tracking-wider rounded-lg border border-slate-700/80 shadow-sm">
              {t('MOQ')}: {product.moq || 1}
              {product.offersOem ? ` • OEM ${product.oemMoq || product.moq}` : ''}
            </span>
            {product.offersOem && (
              <span className="w-fit px-2 py-0.5 bg-cyan-500/90 text-slate-950 text-[10px] font-black uppercase rounded-lg shadow-sm">
                OEM / White-Label
              </span>
            )}
          </div>

          {/* Top-right Origin & Language Badges */}
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1 pointer-events-none">
            {product.originType && (
              <span className="px-2 py-0.5 bg-indigo-950/90 backdrop-blur-md text-indigo-300 border border-indigo-500/35 text-[10px] font-bold rounded-lg">
                {t(product.originType)}
              </span>
            )}
            {langMeta && (
              <span
                title={t(languageLabel(product.language))}
                className="bg-slate-950/85 backdrop-blur-md text-slate-100 border border-slate-700/80 text-[10px] px-1.5 py-0.5 rounded-lg font-bold flex items-center gap-1"
              >
                <span>{langMeta.flag}</span>
                <span>{langMeta.short}</span>
              </span>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-400">
              <div className="flex items-center gap-1 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <Link
                  to={`/company/${seller?.id || product.sellerId || ''}`}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate hover:text-cyan-400 transition-colors font-bold text-slate-300"
                >
                  {seller?.companyName || product.brand || t('Verified Supplier')}
                </Link>
                {seller?.verificationStatus === 'verified' && (
                  <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
              </div>
              {seller?.country && (
                <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                  {seller.country}
                </span>
              )}
            </div>

            <h3 className="text-xs sm:text-[15px] font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug min-h-[34px] sm:min-h-[42px]">
              {product.title}
            </h3>

            {product.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 hidden sm:block leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          <div className="space-y-2.5 pt-2.5 border-t border-slate-800/80">
            <div>
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                {t('Grossistpris (B2B)')}
              </div>
              {tiers ? (
                <div className="space-y-0.5">
                  {tiers.slice(0, 2).map((tierStr: string, i: number) => (
                    <div key={i} className="text-xs font-extrabold text-slate-100 tabular-nums">
                      {tierStr}
                    </div>
                  ))}
                </div>
              ) : minPrice ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-xl font-black text-white tabular-nums">
                    {formatPrice(minPrice)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">/ {t('enhet (PPU)')}</span>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-200">{t('Negotiable')}</div>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={(e) => handleQuickAddB2bCart(product, seller, e)}
              className="w-full py-2 sm:py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/15 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{t('Lägg i RFQ / Varukorg')}</span>
            </motion.button>
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <div className="min-h-screen text-slate-100 space-y-6 sm:space-y-8 pb-20">
      <Helmet>
        <title>
          {t('B2B.Hatake.Shop — International TCG & Hobby B2B Wholesale & AI Sourcing Platform')}
        </title>
        <meta
          name="description"
          content={t(
            'Source TCG accessories, binders, sleeves, acrylic cases, and sealed booster boxes directly from verified manufacturers and distributors with tiered MOQ pricing and instant RFQs.'
          )}
        />
      </Helmet>

      {/* Flagship B2B Wholesale Hero Section (Same elevated principles as hatake.shop, built with Framer Motion) */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`relative overflow-hidden rounded-3xl border p-5 sm:p-8 lg:p-11 ${
          isLight
            ? 'bg-gradient-to-br from-white via-indigo-50/85 to-sky-50/80 border-slate-200/90 shadow-[0_20px_50px_-15px_rgba(79,70,229,0.12)]'
            : 'bg-gradient-to-br from-slate-900 via-[#0c1230] to-slate-950 border-indigo-500/30 shadow-[0_24px_80px_-20px_rgba(99,102,241,0.22)]'
        }`}
      >
        <div className="absolute -top-28 -right-28 w-[440px] h-[440px] bg-indigo-500/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-28 -left-28 w-[440px] h-[440px] bg-cyan-500/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_65%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-7 lg:gap-10">
          <div className="space-y-4 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.35 }}
              className="inline-flex flex-wrap items-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 text-xs font-extrabold backdrop-blur-md">
                <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('B2B Grossist & Direktfabrik · Global Supply Chain')}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-extrabold backdrop-blur-md">
                <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('Verifierade Fabriker & Distributörer')}</span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.4 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.1]"
            >
              {t('Internationell B2B-Grossist för')}{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                {t('TCG & Samlartillbehör')}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-sm sm:text-base text-slate-300/95 leading-relaxed"
            >
              {t(
                'Upphandla förseglade booster-boxar på volym samt fabrikstillverkade OEM-pärmar, sleeves, toploaders och UV-akrylboxar med transparenta MOQ-nivåer, tull- & fraktkalkylator och direkta offertflöden (RFQ).'
              )}
            </motion.p>

            {/* Quick B2B Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="flex flex-wrap items-center gap-2.5 pt-1"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setViewMode('grid');
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                {t('Utforska Grossistkatalogen')}
              </motion.button>
              <Link
                to="/suppliers"
                className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 font-bold text-xs sm:text-sm transition-all inline-flex items-center gap-1.5"
              >
                <Store className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('Leverantörer')}</span>
              </Link>
              <Link
                to="/onboarding"
                className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 font-bold text-xs sm:text-sm transition-all inline-flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('AI-Inköpsassistent')}</span>
              </Link>
            </motion.div>
          </div>

          {/* 2x2 B2B Trust & Capability Pillars */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full lg:w-[380px] shrink-0">
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-slate-950/70 backdrop-blur-md border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl p-3.5 space-y-1 transition-colors"
            >
              <Store className="w-5 h-5 text-indigo-400" />
              <div className="text-xs sm:text-sm font-extrabold text-white">
                {t('OEM & Direktfabrik')}
              </div>
              <div className="text-[11px] text-slate-400 leading-snug">
                {t('White-label pärmar, sleeves, akryl & deckboxes utan mellanhänder')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-slate-950/70 backdrop-blur-md border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-3.5 space-y-1 transition-colors"
            >
              <Truck className="w-5 h-5 text-cyan-400" />
              <div className="text-xs sm:text-sm font-extrabold text-white">
                {t('Landed Cost-kalkyl')}
              </div>
              <div className="text-[11px] text-slate-400 leading-snug">
                {t('Realtidsberäkning av frakt, tull och moms direkt på produkten')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-slate-950/70 backdrop-blur-md border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-1 transition-colors"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div className="text-xs sm:text-sm font-extrabold text-white">
                {t('Tiered MOQ & RFQ')}
              </div>
              <div className="text-[11px] text-slate-400 leading-snug">
                {t('Beställ varuprover eller skicka bulk-offertförfrågningar med 1 klick')}
              </div>
            </motion.div>
            <motion.a
              whileHover={{ y: -3 }}
              href={b2cHref}
              onClick={(e) => {
                e.preventDefault();
                switchSiteMode('b2c');
              }}
              className="bg-gradient-to-br from-cyan-950/85 to-slate-950/90 hover:from-cyan-900/75 border border-cyan-500/40 rounded-2xl p-3.5 space-y-1 group transition-all block"
            >
              <div className="flex items-center justify-between">
                <span className="text-base">🇸🇪</span>
                <ArrowUpRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-white">{t('Hatake.Shop (B2C)')}</div>
              <div className="text-[11px] text-cyan-300 leading-snug">
                {t('Svensk konsumentbutik →')}
              </div>
            </motion.a>
          </div>
        </div>
      </motion.section>

      {/* Scrollable Category Pills Bar with Framer Motion Spring Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId(null);
            setPage(1);
          }}
          className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
            selectedCategoryId === null
              ? 'text-white border-indigo-500'
              : 'bg-slate-900/85 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          {selectedCategoryId === null && (
            <motion.div
              layoutId="b2bActiveCategoryPill"
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25"
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
          )}
          <Layers
            className={`relative z-10 w-4 h-4 ${
              selectedCategoryId === null ? '!text-white' : 'text-indigo-400'
            }`}
          />
          <span className={`relative z-10 ${selectedCategoryId === null ? '!text-white' : ''}`}>
            {t('Alla Kategorier')}
          </span>
        </button>

        {sortedCategories.map((cat: any) => {
          const isActive = selectedCategoryId === cat.id;
          const count = cat.productCount || cat.products?.length || 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(cat.id);
                setViewMode('grid');
                setPage(1);
              }}
              className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                isActive
                  ? 'text-white border-indigo-500'
                  : 'bg-slate-900/85 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="b2bActiveCategoryPill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className={`relative z-10 ${isActive ? '!text-white' : ''}`}>{t(cat.name)}</span>
              {count > 0 && (
                <span
                  className={`relative z-10 text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-black/25 !text-white font-extrabold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unified Live Search, Filter, View Mode & Sort Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="bg-slate-900/85 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-lg"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t(
                'Sök i B2B-katalogen efter pärmar, UV-akryl, sleeves, Pokémon, One Piece, fabriker...'
              )}
              aria-label={t('Search global inventory...')}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                }}
                aria-label={t('Clear')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile Filter Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileFilterSheetOpen(true)}
              className="md:hidden flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span>{t('Filter')}</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Desktop Inline Filters */}
            <div className="hidden md:flex items-center gap-2">
              <select
                value={filters.productType}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, productType: e.target.value }));
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">{t('Alla produkttyper')}</option>
                <option value="sealed">{t('Förseglat & Tillbehör')}</option>
                <option value="graded">{t('Graderade Kort (Slabs)')}</option>
              </select>

              <select
                value={filters.origin}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, origin: e.target.value }));
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
              >
                <option value="">{t('Any Origin')}</option>
                <option value="Direct Factory">{t('Direct Factory')}</option>
                <option value="Verified EU Carrier/Warehouse">{t('EU Warehouse')}</option>
                <option value="Global Distributor">{t('Global Distributor')}</option>
              </select>

              <select
                value={filters.minMoq}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, minMoq: e.target.value }));
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
              >
                <option value="">{t('Any MOQ')}</option>
                <option value="10">{t('MOQ ≤ 10')}</option>
                <option value="50">{t('MOQ ≤ 50')}</option>
                <option value="100">{t('MOQ ≤ 100')}</option>
                <option value="500">{t('MOQ ≤ 500')}</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters((f) => ({ ...f, sortBy: e.target.value }));
                setPage(1);
              }}
              className="flex-1 sm:flex-initial bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              <option value="recommended">{t('Sortera: Utvalda')}</option>
              <option value="lowest_price">{t('Lowest Price')}</option>
              <option value="highest_price">{t('Highest Price')}</option>
              <option value="lowest_moq">{t('Lowest MOQ')}</option>
              <option value="newest">{t('Newest First')}</option>
              <option value="company_az">{t('By Company (A-Z)')}</option>
            </select>

            {/* Grid vs Category Sections View Switcher */}
            <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title={t('Produktvy (Rutnät)')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-indigo-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('Rutnät')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setViewMode('sections');
                }}
                title={t('Kategorier & Leverantörer')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'sections'
                    ? 'bg-indigo-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Rows3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('Sektioner')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="text-slate-400 font-medium">
            {selectedCategoryId ? (
              <>
                {t('Kategori')}:{' '}
                <strong className="text-white">
                  {categoriesData.find((c: any) => c.id === selectedCategoryId)?.name ||
                    sortedCategories.find((c: any) => c.id === selectedCategoryId)?.name}
                </strong>{' '}
                •{' '}
              </>
            ) : null}
            {t('Visar')} <strong className="text-white tabular-nums">{totalCount}</strong>{' '}
            {t('verifierade B2B-grossistprodukter')}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('Återställ filter')}</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Quick Search Results Overlay when typing */}
      {search && (
        <QuickSearchResults
          search={search}
          onSelectProduct={(p) => setSelectedProduct({ product: p, seller: p.seller })}
        />
      )}

      {/* Main Content Area: Either Category/Company Sections or Full Product Grid */}
      {viewMode === 'sections' && !selectedCategoryId && !search ? (
        <div className="space-y-12">
          <BrowseSections
            categories={sortedCategories}
            companies={browseData?.companies || []}
            renderCard={renderB2bCard}
            onViewCategory={(id: number) => {
              setSelectedCategoryId(id);
              setViewMode('grid');
              setSearch('');
              setPage(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      ) : loading && page === 1 && accumulatedProducts.length === 0 ? (
        <SkeletonGrid count={12} />
      ) : products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 sm:p-14 text-center space-y-3"
        >
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg sm:text-xl font-extrabold text-white">
            {t('Inga grossistprodukter matchade dina filter')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {t('Prova att söka på ett annat ord eller återställ dina aktiva filter.')}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs sm:text-sm transition-colors"
          >
            {t('Visa alla B2B-produkter')}
          </button>
        </motion.div>
      ) : (
        <>
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5"
          >
            {products.map((p: any, i: number) => renderB2bCard(p, i))}
          </motion.div>

          {/* Downward Arrow Progressive Load More Footer (Page X / XX) */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-center gap-3 pt-8">
              <div className="text-xs font-bold text-slate-400 tabular-nums">
                {t('Page')} {page} / {totalPages} · {t('Visar')} {products.length}{' '}
                {totalCount ? `/ ${totalCount}` : ''}
              </div>

              {page < totalPages ? (
                <motion.button
                  whileHover={{ scale: 1.03, y: 2 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="group inline-flex flex-col items-center gap-1.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {isFetching
                      ? t('Laddar nästa sida...')
                      : `${t('Ladda fler produkter')} (${t('Page')} ${page + 1} / ${totalPages})`}
                  </span>
                  <ChevronDown className="w-5 h-5 animate-bounce" />
                </motion.button>
              ) : (
                <div className="text-xs font-semibold text-slate-500">
                  ✓ {t('Alla produkter visade')} ({products.length})
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Mobile Bottom-Sheet Filter Drawer */}
      <AnimatePresence>
        {mobileFilterSheetOpen && (
          <div className="fixed inset-0 z-[90] md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              onClick={() => setMobileFilterSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 space-y-4 max-h-[82vh] overflow-y-auto z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <span>{t('Filtrera & Sortera B2B')}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterSheetOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('Produkttyp')}
                  </label>
                  <select
                    value={filters.productType}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, productType: e.target.value }));
                      setPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
                  >
                    <option value="all">{t('Alla produkttyper')}</option>
                    <option value="sealed">{t('Förseglat & Tillbehör')}</option>
                    <option value="graded">{t('Graderade Kort (Slabs)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('Origin')}
                  </label>
                  <select
                    value={filters.origin}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, origin: e.target.value }));
                      setPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
                  >
                    <option value="">{t('Any Origin')}</option>
                    <option value="Direct Factory">{t('Direct Factory')}</option>
                    <option value="Verified EU Carrier/Warehouse">{t('EU Warehouse')}</option>
                    <option value="Global Distributor">{t('Global Distributor')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('Max MOQ')}
                  </label>
                  <select
                    value={filters.minMoq}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, minMoq: e.target.value }));
                      setPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
                  >
                    <option value="">{t('Any MOQ')}</option>
                    <option value="10">{t('MOQ ≤ 10')}</option>
                    <option value="50">{t('MOQ ≤ 50')}</option>
                    <option value="100">{t('MOQ ≤ 100')}</option>
                    <option value="500">{t('MOQ ≤ 500')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  {t('Rensa alla')}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterSheetOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white font-extrabold text-xs"
                >
                  {t('Visa resultat')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          products={products}
          onSelectProduct={setSelectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
