import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  ShieldCheck,
  Package,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Check,
  Award,
  Layers,
  Box,
  Building2,
  PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProductModal } from '../components/ProductModal.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { useCurrency } from '../components/CurrencyProvider.tsx';
import { useSiteMode } from '../components/SiteModeContext.tsx';
import { useTheme } from '../components/ThemeContext.tsx';
import { SafeImage, optimizeImageUrl } from '../components/SafeImage.tsx';
import {
  PRODUCT_LANGUAGES,
  TCG_GAMES,
  languageLabel,
  sealedTypeLabel,
  inferProductDomain,
  inferTcgGame,
  tcgGameLabel,
} from '../lib/productTaxonomy.ts';

export type B2CCategoryTab =
  | 'all'
  | 'booster_boxes'
  | 'etb_collections'
  | 'decks'
  | 'graded'
  | 'accessories';

function parseProductImages(p: any): string[] {
  const extract = (raw: any): string[] => {
    if (!raw) return [];
    try {
      const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((u: any) => typeof u === 'string' && u.trim()) : [];
    } catch {
      return [];
    }
  };
  const svImgs = extract(p?.sverigeImages);
  if (svImgs.length > 0) return svImgs;
  return extract(p?.images);
}

export function getB2cPriceSEK(p: any): number {
  const svPrice = parseFloat(String(p?.sverigePrice ?? ''));
  if (Number.isFinite(svPrice) && svPrice > 0) return svPrice;
  const unitCost = parseFloat(String(p?.unitCost ?? ''));
  if (Number.isFinite(unitCost) && unitCost > 0) {
    return unitCost < 15 ? Math.round(unitCost * 12) : Math.round(unitCost);
  }
  return 199;
}

export function matchesB2cCategoryTab(p: any, tab: B2CCategoryTab): boolean {
  if (tab === 'all') return true;
  const title = String(p?.sverigeTitle || p?.title || '').toLowerCase();
  const brand = String(p?.brand || '').toLowerCase();
  const sealedType = String(p?.sealedType || '').toLowerCase();
  const productType = String(p?.productType || '').toLowerCase();

  if (tab === 'graded') {
    return (
      productType === 'graded' ||
      Boolean(p?.gradingCompany) ||
      title.includes('psa ') ||
      title.includes('bgs ') ||
      title.includes('cgc ') ||
      title.includes('graderat')
    );
  }
  if (tab === 'decks') {
    return (
      sealedType === 'deck' ||
      title.includes('starter deck') ||
      (title.includes('deck') &&
        !title.includes('deckbox') &&
        !title.includes('deck case') &&
        !title.includes('sleeves'))
    );
  }
  if (tab === 'accessories') {
    return (
      p?.productDomain === 'merchandise' ||
      ['accessory', 'binder', 'sleeves', 'toploaders', 'acrylic_case', 'deck_box', 'playmat', 'collectible_merch'].includes(sealedType) ||
      brand.includes('topbestpkg') ||
      title.includes('pärm') ||
      title.includes('binder') ||
      title.includes('toploader') ||
      title.includes('sleeve') ||
      title.includes('deckbox') ||
      title.includes('deck case') ||
      title.includes('playmat') ||
      title.includes('spelmatta') ||
      title.includes('akryl') ||
      title.includes('acrylic') ||
      title.includes('magnethållare') ||
      title.includes('magnetic card holder')
    );
  }
  if (tab === 'etb_collections') {
    return (
      sealedType === 'etb' ||
      sealedType === 'collection_box' ||
      sealedType === 'premium_collection' ||
      sealedType === 'tin' ||
      title.includes('etb') ||
      title.includes('elite trainer') ||
      title.includes('gift box') ||
      title.includes('collection') ||
      title.includes('luxury')
    );
  }
  if (tab === 'booster_boxes') {
    return (
      (sealedType === 'booster_box' ||
        sealedType === 'booster_bundle' ||
        sealedType === 'case' ||
        sealedType === 'booster_pack' ||
        sealedType === 'blister' ||
        title.includes('booster box')) &&
      !title.includes('akryl') &&
      !title.includes('acrylic') &&
      !title.includes('gift box')
    );
  }
  return true;
}

/* ---------- Swipeable Product Image Stage ---------- */
const SwipeableProductImage = ({ images, title }: { images: string[]; title: string }) => {
  const [idx, setIdx] = useState(0);
  const touchStartX = React.useRef<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950/90">
        <Package className="w-10 h-10 text-slate-700" />
      </div>
    );
  }

  const safeIdx = idx < images.length ? idx : 0;

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
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-800/30 via-slate-900/70 to-slate-950"
    >
      <SafeImage
        src={optimizeImageUrl(images[safeIdx], 500)}
        alt={title}
        fallbackIcon={<Package className="w-10 h-10 text-slate-600" />}
        className="w-full h-full object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform duration-500"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((prev) => (prev - 1 + images.length) % images.length);
            }}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((prev) => (prev + 1) % images.length);
            }}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1 z-10 pointer-events-none">
            {images.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === safeIdx ? 'w-4 bg-cyan-400' : 'w-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export function SwedenShop() {
  const { addSverigeItem } = useCart();
  const { formatSEK } = useCurrency();
  const { switchSiteMode, b2bHref } = useSiteMode();
  const { isLight } = useTheme();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sverigeProducts, setSverigeProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);

  const querySearch = searchParams.get('q') || '';
  const activeTab = (searchParams.get('cat') as B2CCategoryTab) || 'all';
  const [searchInput, setSearchInput] = useState(querySearch);
  const [domainFilter, setDomainFilter] = useState<'all' | 'tcg' | 'merchandise'>('all');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'preorder'>('all');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'newest' | 'name_az'>('featured');

  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === querySearch.trim()) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 220);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api-v2/sverige-products')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setSverigeProducts(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const setCategoryTab = (tab: B2CCategoryTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'all') next.delete('cat');
    else next.set('cat', tab);
    setSearchParams(next, { replace: false });
  };

  const categoryTabs: { id: B2CCategoryTab; label: string; count: number; icon: any }[] = useMemo(() => {
    const countFor = (tab: B2CCategoryTab) =>
      sverigeProducts.filter((p) => matchesB2cCategoryTab(p, tab)).length;
    const allTabs: { id: B2CCategoryTab; label: string; count: number; icon: any }[] = [
      { id: 'all', label: t('Alla produkter'), count: sverigeProducts.length, icon: Layers },
      { id: 'booster_boxes', label: t('Booster-boxar'), count: countFor('booster_boxes'), icon: Box },
      { id: 'etb_collections', label: t('ETB & Samlarboxar'), count: countFor('etb_collections'), icon: Sparkles },
      { id: 'decks', label: t('Kortlekar & Decks'), count: countFor('decks'), icon: Package },
      { id: 'graded', label: t('Graderade Kort'), count: countFor('graded'), icon: Award },
      { id: 'accessories', label: t('Merchandise & Tillbehör'), count: countFor('accessories'), icon: ShieldCheck },
    ];
    // Hide all empty categories except 'all'
    return allTabs.filter((tab) => tab.id === 'all' || tab.count > 0);
  }, [sverigeProducts, t, i18n.language]);

  const domainCounts = useMemo(() => {
    let tcg = 0;
    let merchandise = 0;
    for (const p of sverigeProducts) {
      if (inferProductDomain(p) === 'merchandise') merchandise++;
      else tcg++;
    }
    return { tcg, merchandise };
  }, [sverigeProducts]);

  const availableGames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of sverigeProducts) {
      const g = inferTcgGame(p);
      if (g) counts.set(g, (counts.get(g) || 0) + 1);
    }
    return TCG_GAMES.map((g) => ({ ...g, count: counts.get(g.value) || 0 })).filter((g) => g.count > 0);
  }, [sverigeProducts]);

  const availableBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of sverigeProducts) {
      const b = String(p.brand || '').trim();
      if (b) counts.set(b, (counts.get(b) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  }, [sverigeProducts]);

  const availableLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of sverigeProducts) {
      if (p.language) counts.set(p.language, (counts.get(p.language) || 0) + 1);
    }
    return PRODUCT_LANGUAGES.map((l) => ({ ...l, count: counts.get(l.value) || 0 })).filter(
      (l) => l.count > 0
    );
  }, [sverigeProducts]);

  const filteredProducts = useMemo(() => {
    const q = querySearch.trim().toLowerCase();
    const list = sverigeProducts.filter((p) => {
      if (!matchesB2cCategoryTab(p, activeTab)) return false;

      if (domainFilter !== 'all') {
        if (inferProductDomain(p) !== domainFilter) return false;
      }

      if (gameFilter !== 'all') {
        if (inferTcgGame(p) !== gameFilter) return false;
      }

      if (stockFilter === 'in_stock') {
        if (p.isPreorder || (typeof p.stockQuantity === 'number' && p.stockQuantity <= 0)) return false;
      } else if (stockFilter === 'preorder') {
        if (!p.isPreorder) return false;
      }

      if (langFilter !== 'all') {
        if (p.language !== langFilter) return false;
      }

      if (brandFilter !== 'all') {
        if (String(p.brand || '').toLowerCase() !== brandFilter.toLowerCase()) return false;
      }

      if (q) {
        const hay = [
          p.sverigeTitle,
          p.title,
          p.brand,
          p.tcgGame,
          tcgGameLabel(p.tcgGame),
          p.description,
          p.categoryName,
          p.cardSet,
          p.gradingCompany,
          p.sealedType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => getB2cPriceSEK(a) - getB2cPriceSEK(b));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => getB2cPriceSEK(b) - getB2cPriceSEK(a));
    } else if (sortBy === 'name_az') {
      sorted.sort((a, b) =>
        String(a.sverigeTitle || a.title || '').localeCompare(String(b.sverigeTitle || b.title || ''), 'sv')
      );
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return sorted;
  }, [sverigeProducts, activeTab, domainFilter, gameFilter, stockFilter, langFilter, brandFilter, querySearch, sortBy]);

  const activeFilterCount =
    (activeTab !== 'all' ? 1 : 0) +
    (domainFilter !== 'all' ? 1 : 0) +
    (gameFilter !== 'all' ? 1 : 0) +
    (stockFilter !== 'all' ? 1 : 0) +
    (langFilter !== 'all' ? 1 : 0) +
    (brandFilter !== 'all' ? 1 : 0) +
    (querySearch.trim() ? 1 : 0);

  const resetFilters = () => {
    setSearchInput('');
    setDomainFilter('all');
    setGameFilter('all');
    setStockFilter('all');
    setLangFilter('all');
    setBrandFilter('all');
    setSortBy('featured');
    setSearchParams(new URLSearchParams(), { replace: false });
  };

  const handleAddB2cCart = (p: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const imgs = parseProductImages(p);
    const priceSek = getB2cPriceSEK(p);
    const displayTitle = p.sverigeTitle || p.title;
    addSverigeItem({
      productId: p.id,
      title: displayTitle,
      image: imgs[0] || '',
      sellerName: 'Hatake Sverige',
      sellerId: p.sellerId || 1,
      unitCost: priceSek,
      quantity: 1,
      stockQuantity: p.stockQuantity,
      isPreorder: Boolean(p.isPreorder),
      preorderLabel: p.preorderLabel || undefined,
    });
    toast.success(`${t('Tillagd i varukorgen')}: ${displayTitle}`);
  };

  const currentIndex = selectedProduct
    ? filteredProducts.findIndex((p) => p.id === selectedProduct.id)
    : -1;
  const handlePrevProduct = () => {
    if (filteredProducts.length <= 1) return;
    const prevIdx = (currentIndex - 1 + filteredProducts.length) % filteredProducts.length;
    setSelectedProduct(filteredProducts[prevIdx]);
  };
  const handleNextProduct = () => {
    if (filteredProducts.length <= 1) return;
    const nextIdx = (currentIndex + 1) % filteredProducts.length;
    setSelectedProduct(filteredProducts[nextIdx]);
  };

  return (
    <div className="min-h-screen text-slate-100 space-y-6 sm:space-y-8 pb-16">
      <Helmet>
        <title>{t('Hatake.Shop — Sveriges & Nordens TCG- & Hobbybutik | Booster Boxes, Singles & Tillbehör')}</title>
        <meta
          name="description"
          content={t(
            'Handla förseglade TCG-produkter, booster-boxar, graderade kort, pärmar, toploaders och akrylboxar direkt från vårt svenska lager med 1–3 vardagars leverans.'
          )}
        />
        <link rel="canonical" href="https://hatake.shop/" />
        <link rel="alternate" hrefLang="sv-SE" href="https://hatake.shop/" />
        <link rel="alternate" hrefLang="en" href="https://hatake.shop/?lang=en" />
      </Helmet>

      {/* Nordic Flagship Hero Section (Framer Motion) */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`relative overflow-hidden rounded-3xl border p-5 sm:p-8 lg:p-11 ${
          isLight
            ? 'bg-gradient-to-br from-white via-sky-50/90 to-indigo-50/75 border-slate-200/90 shadow-[0_20px_50px_-15px_rgba(2,132,199,0.12)]'
            : 'bg-gradient-to-br from-slate-900 via-[#07142e] to-slate-950 border-slate-800/90 shadow-[0_24px_80px_-20px_rgba(6,182,212,0.18)]'
        }`}
      >
        <div className="absolute -top-28 -right-28 w-[420px] h-[420px] bg-cyan-500/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-28 -left-28 w-[420px] h-[420px] bg-indigo-500/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_65%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-7 lg:gap-10">
          <div className="space-y-4 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.35 }}
              className="inline-flex flex-wrap items-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-extrabold backdrop-blur-md">
                <span>🇸🇪</span>
                <span>{t('Svenskt Lager · Snabb Leverans 1–3 Vardagar')}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold backdrop-blur-md">
                <Check className="w-3.5 h-3.5" />
                <span>{t('Fri frakt över 999 kr')}</span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.4 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.1]"
            >
              {t('Sveriges & Nordens Butik för')}{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
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
                'Handla fabriksförseglade booster-boxar, Elite Trainer Boxes, kortlekar, verifierade graderade samlarkort samt premiumpärmar, sleeves och UV-akrylskydd — prissatt i SEK inklusive moms med snabb leverans.'
              )}
            </motion.p>

            {/* Quick Category Action Buttons (only show non-empty categories) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="flex flex-wrap items-center gap-2.5 pt-1"
            >
              {categoryTabs.some((c) => c.id === 'booster_boxes') && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setCategoryTab('booster_boxes')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  {t('Shoppa Booster-boxar')}
                </motion.button>
              )}
              {categoryTabs.some((c) => c.id === 'accessories') && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setCategoryTab('accessories')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  {t('Merchandise & Tillbehör')}
                </motion.button>
              )}
              {categoryTabs.some((c) => c.id === 'graded') && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setCategoryTab('graded')}
                  className="px-4 py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/35 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('Graderade Kort')}</span>
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Nordic Trust Pillars Card */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full lg:w-[370px] shrink-0">
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-slate-950/70 backdrop-blur-md border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-3.5 space-y-1 transition-colors"
            >
              <Truck className="w-5 h-5 text-cyan-400" />
              <div className="text-xs sm:text-sm font-extrabold text-white">{t('1–3 Vardagar')}</div>
              <div className="text-[11px] text-slate-400 leading-snug">
                {t('Spårbar frakt från Sverige med PostNord & DHL')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-slate-950/70 backdrop-blur-md border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-1 transition-colors"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div className="text-xs sm:text-sm font-extrabold text-white">{t('100% Äkta TCG')}</div>
              <div className="text-[11px] text-slate-400 leading-snug">
                {t('Fabriksförseglade produkter & verifierade slabs')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-slate-950/70 backdrop-blur-md border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-3.5 space-y-1 transition-colors"
            >
              <Award className="w-5 h-5 text-amber-400" />
              <div className="text-xs sm:text-sm font-extrabold text-white">{t('Trygg Betalning')}</div>
              <div className="text-[11px] text-slate-400 leading-snug">
                {t('Säker direktbetalning i SEK via Stripe Checkout')}
              </div>
            </motion.div>
            <motion.a
              whileHover={{ y: -3 }}
              href={b2bHref}
              onClick={(e) => {
                e.preventDefault();
                switchSiteMode('b2b');
              }}
              className="bg-gradient-to-br from-indigo-950/85 to-slate-950/90 hover:from-indigo-900/75 border border-indigo-500/40 rounded-2xl p-3.5 space-y-1 group transition-all block"
            >
              <div className="flex items-center justify-between">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <ArrowUpRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-white">{t('Grossist / B2B')}</div>
              <div className="text-[11px] text-indigo-300 leading-snug">b2b.hatake.shop →</div>
            </motion.a>
          </div>
        </div>
      </motion.section>

      {/* Scrollable Category Tabs Bar (Empty Categories Automatically Hidden) */}
      {sverigeProducts.length > 0 && categoryTabs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryTab(tab.id)}
                className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                  isActive
                    ? 'text-white border-cyan-500'
                    : 'bg-slate-900/85 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="b2cActiveCategoryPill"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 shadow-lg shadow-cyan-500/25"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon className={`relative z-10 w-4 h-4 ${isActive ? '!text-white' : 'text-cyan-400'}`} />
                <span className={`relative z-10 ${isActive ? '!text-white' : ''}`}>{tab.label}</span>
                <span
                  className={`relative z-10 text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive ? 'bg-black/25 !text-white font-extrabold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search, Filter & Sort Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="bg-slate-900/85 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-lg"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('Sök bland produkter, booster-boxar, pärmar, toploaders, PSA 10...')}
              aria-label={t('Search products...')}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label={t('Clear')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter Bottom-Sheet Trigger + Sort */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFilterSheetOpen(true)}
              className="md:hidden flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200"
            >
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>{t('Filter')}</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Desktop Inline Filters */}
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {(domainCounts.tcg > 0 && domainCounts.merchandise > 0) && (
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value as any)}
                  aria-label={t('Klassificering')}
                  className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">{t('TCG & Merchandise')}</option>
                  <option value="tcg">TCG ({domainCounts.tcg})</option>
                  <option value="merchandise">{t('Merchandise')} ({domainCounts.merchandise})</option>
                </select>
              )}

              {availableGames.length > 0 && (
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  aria-label={t('TCG-Spel')}
                  className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">{t('Alla TCG-spel')}</option>
                  {availableGames.map((g) => (
                    <option key={g.value} value={g.value}>
                      {t(g.label)} ({g.count})
                    </option>
                  ))}
                </select>
              )}

              {availableBrands.length > 1 && (
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  aria-label={t('Varumärke')}
                  className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">{t('Alla varumärken')}</option>
                  {availableBrands.map((b) => (
                    <option key={b.brand} value={b.brand}>
                      {b.brand} ({b.count})
                    </option>
                  ))}
                </select>
              )}

              {availableLanguages.length > 0 && (
                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value)}
                  aria-label={t('Language / Edition')}
                  className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">{t('Alla språk')}</option>
                  {availableLanguages.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.flag} {t(l.label)} ({l.count})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                aria-label={t('Lagerstatus')}
                className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">{t('Alla lagerstatusar')}</option>
                <option value="in_stock">{t('I lager (Omgående leverans)')}</option>
                <option value="preorder">{t('Förhandsbokning (Preorder)')}</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label={t('Sort By')}
              className="flex-1 md:flex-initial bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              <option value="featured">{t('Sortera: Utvalda')}</option>
              <option value="price_asc">{t('Pris: Lägst till högst')}</option>
              <option value="price_desc">{t('Pris: Högst till lägst')}</option>
              <option value="newest">{t('Nyast först')}</option>
              <option value="name_az">{t('Namn: A–Ö')}</option>
            </select>
          </div>
        </div>

        {/* Active filter pills + Result count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="text-slate-400 font-medium">
            {t('Visar')} <strong className="text-white tabular-nums">{filteredProducts.length}</strong>{' '}
            {t('produkter i svenskt sortiment (inkl. 25% moms)')}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('Återställ filter')}</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Product Grid — 2 columns on mobile (360px+) up to 4 columns on desktop */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 animate-pulse"
            >
              <div className="aspect-square rounded-xl bg-slate-800" />
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
              <div className="h-9 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : sverigeProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 rounded-3xl p-10 sm:p-16 text-center space-y-4 shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto text-cyan-400">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {t('Nya produkter fylls på i vårt svenska lager')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {t(
                'Vi uppdaterar just nu sortimentet med nya booster-boxar, graderade samlarkort och tillbehör. Titta gärna in snart igen eller besök vår B2B-grossistplattform.'
              )}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href={b2bHref}
              onClick={(e) => {
                e.preventDefault();
                switchSiteMode('b2b');
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>{t('Besök B2B Grossist')}</span>
            </a>
          </div>
        </motion.div>
      ) : filteredProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 sm:p-14 text-center space-y-3"
        >
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg sm:text-xl font-extrabold text-white">
            {t('Inga produkter matchade dina filter')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {t('Prova att söka på ett annat ord eller återställ dina aktiva kategorifilter.')}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm transition-colors"
          >
            {t('Visa alla produkter')}
          </button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5"
        >
          {filteredProducts.map((p, idx) => {
            const images = parseProductImages(p);
            const displayTitle = p.sverigeTitle || p.title;
            const priceSek = getB2cPriceSEK(p);
            const stock = typeof p.stockQuantity === 'number' ? p.stockQuantity : 15;
            const langMeta = p.language ? PRODUCT_LANGUAGES.find((x) => x.value === p.language) : null;
            const isGraded = p.productType === 'graded' || Boolean(p.gradingCompany);
            const domain = inferProductDomain(p);
            const gameLabel = tcgGameLabel(inferTcgGame(p));

            return (
              <motion.article
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.25) }}
                whileHover={{ y: -5 }}
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="group bg-slate-900/90 backdrop-blur-md border border-slate-800/90 hover:border-cyan-500/50 rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-colors duration-300 hover:shadow-2xl hover:shadow-cyan-950/40"
              >
                {/* Image Stage */}
                <div className="relative aspect-square w-full border-b border-slate-800/80 overflow-hidden">
                  <SwipeableProductImage images={images} title={displayTitle} />

                  {/* Top-left Stock / Preorder Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 pointer-events-none">
                    {p.isPreorder ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/90 backdrop-blur-sm text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                        {p.preorderLabel || t('Förhandsbokning')}
                      </span>
                    ) : stock > 0 && stock <= 8 ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/90 backdrop-blur-sm text-slate-950 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                        {t('Få kvar')} ({stock} {t('st')})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/90 backdrop-blur-sm text-slate-950 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                        {t('I lager')}
                      </span>
                    )}
                    {isGraded && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {p.gradingCompany || 'PSA'} {p.grade || '10'}
                      </span>
                    )}
                  </div>

                  {/* Top-right Language Badge */}
                  {langMeta && (
                    <span
                      title={t(languageLabel(p.language))}
                      className="absolute top-2.5 right-2.5 z-10 bg-slate-950/85 backdrop-blur-md text-slate-100 border border-slate-700/80 text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 pointer-events-none"
                    >
                      <span>{langMeta.flag}</span>
                      <span>{langMeta.short}</span>
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                      <span className="truncate">
                        {domain === 'merchandise' ? t('Merchandise') : gameLabel || p.brand || 'TCG'}
                      </span>
                      {p.sealedType && (
                        <span className="text-slate-400 font-medium truncate hidden sm:inline">
                          {t(sealedTypeLabel(p.sealedType))}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-[15px] font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug min-h-[34px] sm:min-h-[42px]">
                      {displayTitle}
                    </h3>

                    {p.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 hidden sm:block leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-2.5 border-t border-slate-800/80">
                    <div className="flex items-baseline justify-between gap-1">
                      <div>
                        <div className="text-base sm:text-xl font-black text-white tabular-nums tracking-tight">
                          {formatSEK(priceSek)}
                        </div>
                        <div className="text-[10px] text-slate-400">{t('Inkl. moms · Svenskt lager')}</div>
                      </div>
                      <Link
                        to={`/product/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-semibold text-slate-400 hover:text-cyan-300 underline hidden sm:inline"
                      >
                        {t('Detaljer')}
                      </Link>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={(e) => handleAddB2cCart(p, e)}
                      className="w-full py-2 sm:py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/15 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">
                        {p.isPreorder ? t('Förhandsboka') : t('Lägg i varukorg')}
                      </span>
                    </motion.button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {/* B2B Cross-Link Callout Card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl"
      >
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-300">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>{t('Hatake B2B Wholesale · För Butiker & Återförsäljare')}</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-white">
            {t('Driver du en kortbutik, e-handel eller förening?')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t(
              'På b2b.hatake.shop handlar du master cases, booster-boxar på volym och fabrikstillverkade OEM-tillbehör direkt från verifierade distributörer och fabriker.'
            )}
          </p>
        </div>
        <a
          href={b2bHref}
          onClick={(e) => {
            e.preventDefault();
            switchSiteMode('b2b');
          }}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-500/20"
        >
          <span>{t('Öppna B2B Grossist (b2b.hatake.shop)')}</span>
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </motion.section>

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
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span>{t('Filtrera & Sortera')}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterSheetOpen(false)}
                  aria-label={t('Close')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('Kategori')}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {categoryTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCategoryTab(tab.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all flex items-center justify-between ${
                          activeTab === tab.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span className="truncate">{tab.label}</span>
                        <span className="text-[10px] opacity-80">({tab.count})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(domainCounts.tcg > 0 && domainCounts.merchandise > 0) && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Klassificering')}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'all', label: t('Alla') },
                        { id: 'tcg', label: 'TCG' },
                        { id: 'merchandise', label: t('Merchandise') },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDomainFilter(opt.id as any)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                            domainFilter === opt.id
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                              : 'bg-slate-950 text-slate-300 border-slate-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableGames.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('TCG-Spel')}
                    </label>
                    <select
                      value={gameFilter}
                      onChange={(e) => setGameFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
                    >
                      <option value="all">{t('Alla TCG-spel')}</option>
                      {availableGames.map((g) => (
                        <option key={g.value} value={g.value}>
                          {t(g.label)} ({g.count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availableBrands.length > 1 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Varumärke')}
                    </label>
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
                    >
                      <option value="all">{t('Alla varumärken')}</option>
                      {availableBrands.map((b) => (
                        <option key={b.brand} value={b.brand}>
                          {b.brand} ({b.count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availableLanguages.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('Language / Edition')}
                    </label>
                    <select
                      value={langFilter}
                      onChange={(e) => setLangFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none"
                    >
                      <option value="all">{t('Alla språk')}</option>
                      {availableLanguages.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.flag} {t(l.label)} ({l.count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {t('Lagerstatus')}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'all', label: t('Alla') },
                      { id: 'in_stock', label: t('I lager') },
                      { id: 'preorder', label: t('Förhandsbokning') },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStockFilter(opt.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                          stockFilter === opt.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
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
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs"
                >
                  {t('Visa resultat')} ({filteredProducts.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B2C Product Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          hideMOQ={true}
          onAddToCart={() => handleAddB2cCart(selectedProduct)}
          onPrevProduct={filteredProducts.length > 1 ? handlePrevProduct : undefined}
          onNextProduct={filteredProducts.length > 1 ? handleNextProduct : undefined}
          productIndex={currentIndex >= 0 ? currentIndex + 1 : undefined}
          totalProducts={filteredProducts.length > 1 ? filteredProducts.length : undefined}
        />
      )}
    </div>
  );
}
