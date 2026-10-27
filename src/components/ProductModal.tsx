import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import {
  X,
  PackageSearch,
  Building2,
  MapPin,
  Package,
  Clock,
  ShieldCheck,
  Mail,
  ChevronLeft,
  ChevronRight,
  Link2,
  Check,
  Factory,
  ShoppingBag,
  Send,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrency } from './CurrencyProvider.tsx';
import { useCart } from './SampleCart.tsx';
import { WishlistButton } from './WishlistButton.tsx';
import { ImageMagnifier } from './ImageMagnifier.tsx';
import { LandedCostEstimator } from './LandedCostEstimator.tsx';
import { VerificationBadge } from './VerificationBadge.tsx';
import { languageLabel, sealedTypeLabel, PRODUCT_LANGUAGES } from '../lib/productTaxonomy.ts';

export interface ProductModalProps {
  product: any;
  products?: any[];
  onSelectProduct?: (product: any) => void;
  onClose: () => void;
  hideMOQ?: boolean;
  onAddToCart?: () => void;
  onPrevProduct?: () => void;
  onNextProduct?: () => void;
  productIndex?: number;
  totalProducts?: number;
}

function parseJsonArray(val: any): any[] {
  try {
    const parsed = Array.isArray(val) ? val : JSON.parse(val || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSpecifications(val: any): Record<string, any> {
  if (!val) return {};
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function ProductModal({
  product: rawProduct,
  products,
  onSelectProduct,
  onClose,
  hideMOQ = false,
  onAddToCart,
  onPrevProduct,
  onNextProduct,
  productIndex,
  totalProducts,
}: ProductModalProps) {
  const { t } = useTranslation();
  const { formatPrice, currency } = useCurrency();
  const { addItem, setCartOpen } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Normalize `{ product, seller }` wrapper if passed from legacy callers
  const product = useMemo(() => {
    if (!rawProduct) return null;
    if (rawProduct.product && typeof rawProduct.product === 'object') {
      return { ...rawProduct.product, seller: rawProduct.seller || rawProduct.product.seller || {} };
    }
    return rawProduct;
  }, [rawProduct]);

  // Derive Prev / Next navigation automatically when `products` + `onSelectProduct` are provided
  const computedIdx = useMemo(() => {
    if (!products || !product) return -1;
    return products.findIndex((item: any) => Number((item?.product || item)?.id) === Number(product.id));
  }, [products, product]);

  const effectiveTotal = totalProducts ?? (products && computedIdx >= 0 ? products.length : undefined);
  const effectiveIndex = productIndex ?? (computedIdx >= 0 ? computedIdx + 1 : undefined);

  const handlePrev = onPrevProduct || (products && onSelectProduct && computedIdx >= 0 && products.length > 1
    ? () => {
        const prev = products[(computedIdx - 1 + products.length) % products.length];
        onSelectProduct(prev);
      }
    : undefined);

  const handleNext = onNextProduct || (products && onSelectProduct && computedIdx >= 0 && products.length > 1
    ? () => {
        const next = products[(computedIdx + 1) % products.length];
        onSelectProduct(next);
      }
    : undefined);

  const images: string[] = useMemo(() => {
    if (!product) return [];
    const sv = parseJsonArray(product.sverigeImages);
    if (sv.length > 0) return sv.filter((u: any) => typeof u === 'string' && u.trim());
    return parseJsonArray(product.images).filter((u: any) => typeof u === 'string' && u.trim());
  }, [product]);

  const tiers = useMemo(() => parseJsonArray(product?.tieredPricing), [product]);
  const specsObj = useMemo(() => parseSpecifications(product?.specifications), [product]);

  const [activeImage, setActiveImage] = useState<string | null>(images[0] || null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 1-Step Quote & Order Builder State
  const defaultMoq = Math.max(1, Number(product?.moq || 1));
  const oemMoqVal = Math.max(defaultMoq, Number(product?.oemMoq || defaultMoq));
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteMode, setQuoteMode] = useState<'wholesale' | 'oem' | 'sample'>('wholesale');
  const [orderQty, setOrderQty] = useState<number>(defaultMoq);
  const [targetBudget, setTargetBudget] = useState<string>('');
  const [shippingDest, setShippingDest] = useState<string>('EU');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  React.useEffect(() => {
    setActiveImage(images[0] || null);
    const nextMoq = Math.max(1, Number(product?.moq || 1));
    setOrderQty(nextMoq);
    setQuoteMode('wholesale');
    setQuoteOpen(false);
    setTargetBudget('');
    setQuoteNotes('');
  }, [product?.id]);

  // Compute active unit price for chosen `orderQty`
  const activeUnitPrice = useMemo<number | null>(() => {
    if (!product) return null;
    if (tiers.length > 0) {
      const sorted = [...tiers]
        .map((tr: any) => ({
          min: Number(tr.minQty ?? tr.quantity ?? 1),
          max: tr.maxQty ? Number(tr.maxQty) : Infinity,
          price: Number(tr.price ?? tr.unitPrice ?? 0),
        }))
        .filter(tr => Number.isFinite(tr.price) && tr.price > 0)
        .sort((a, b) => a.min - b.min);
      if (sorted.length > 0) {
        let matched = sorted[0].price;
        for (const tr of sorted) {
          if (orderQty >= tr.min) matched = tr.price;
        }
        return matched;
      }
    }
    const base = Number(product.unitCost ?? product.unitPrice ?? 0);
    return Number.isFinite(base) && base > 0 ? base : null;
  }, [product, tiers, orderQty]);

  const handleModeSelect = (mode: 'wholesale' | 'oem' | 'sample') => {
    setQuoteMode(mode);
    if (mode === 'sample') setOrderQty(1);
    else if (mode === 'oem') setOrderQty(oemMoqVal);
    else setOrderQty(defaultMoq);
  };

  const handleCopyProductLink = () => {
    if (!product?.id) return;
    const url = `${window.location.origin}/product/${product.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedLink(true);
        toast.success(t('Direct product link copied to clipboard'));
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch(() => {
        toast.error(t('Could not copy link'));
      });
  };

  const handleAddToB2BCart = (asSample: boolean) => {
    if (!product) return;
    const qty = asSample ? 1 : Math.max(defaultMoq, orderQty);
    addItem({
      productId: product.id,
      title: product.title,
      image: activeImage || images[0] || '',
      sellerId: Number(product.seller?.id ?? product.sellerId ?? 0),
      sellerName: product.seller?.companyName || 'Verified Supplier',
      quantity: qty,
      moq: Number(defaultMoq) || undefined,
      unitCost: activeUnitPrice ?? Number(product.unitCost || 0),
    });
    toast.success(
      asSample
        ? `${t('Sample added to cart')}: ${product.title}`
        : `${qty} ${t('units added to wholesale cart')}`,
      {
        action: {
          label: t('Open Cart'),
          onClick: () => {
            onClose();
            setCartOpen(true);
          },
        },
      }
    );
  };

  const submitDirectRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }
    setIsSubmittingInquiry(true);
    try {
      const modePrefix =
        quoteMode === 'oem'
          ? '[OEM / Custom Branding Run] '
          : quoteMode === 'sample'
            ? '[Paid Sample Evaluation] '
            : '[Wholesale Order Quote] ';
      const estBudget =
        targetBudget.trim() !== ''
          ? targetBudget.trim()
          : activeUnitPrice
            ? (activeUnitPrice * orderQty).toFixed(2)
            : undefined;

      const res = await fetch('/api-v2/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          targetProductId: product.id,
          quantity: Math.max(1, orderQty),
          targetBudget: estBudget,
          currency: currency || 'EUR',
          shippingDestination: shippingDest,
          status: 'Pending',
          aiNotes: `${modePrefix}${quoteNotes.trim() || `Requesting quote for ${orderQty} units.`}`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to submit RFQ');
      }
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      toast.success(t('Quote request sent to supplier!'));
      onClose();
      navigate(`/rfq/${created.id}`);
    } catch (err: any) {
      toast.error(err?.message || t('Failed to send quote request'));
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  // Touch swipe support for navigating product to product
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.thumbnails-container') || target.closest('input') || target.closest('textarea')) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0 && handleNext) handleNext();
      else if (deltaX > 0 && handlePrev) handlePrev();
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === 'ArrowLeft' && handlePrev) {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' && handleNext) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  if (!product) return null;

  const langMeta = product.language ? PRODUCT_LANGUAGES.find(x => x.value === product.language) : null;
  const sellerId = product.seller?.id || product.sellerId;
  const activeImgIdx = Math.max(0, images.indexOf(activeImage || ''));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Floating Left Arrow */}
      {handlePrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label={t('Previous product')}
          title={`${t('Previous product')} (←)`}
          className="hidden md:flex absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-2xl items-center justify-center transition-all hover:scale-105 z-30 group"
        >
          <ChevronLeft className="w-6 h-6 text-slate-300 group-hover:text-cyan-300 transition-colors" />
        </button>
      )}

      {/* Floating Right Arrow */}
      {handleNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label={t('Next product')}
          title={`${t('Next product')} (→)`}
          className="hidden md:flex absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-2xl items-center justify-center transition-all hover:scale-105 z-30 group"
        >
          <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-cyan-300 transition-colors" />
        </button>
      )}

      <div
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-20 sticky top-0 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
              {product.sverigeTitle || product.title}
            </h2>
            {effectiveTotal && effectiveTotal > 1 && effectiveIndex && (
              <span className="shrink-0 text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-bold tabular-nums">
                {effectiveIndex} / {effectiveTotal}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!hideMOQ && product.id && (
              <button
                type="button"
                onClick={handleCopyProductLink}
                title={t('Copy direct product link')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? t('Copied') : t('Share Link')}</span>
              </button>
            )}

            {handlePrev && handleNext && (
              <div className="flex items-center gap-0.5 bg-slate-800/80 border border-slate-700 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="p-1.5 hover:text-white text-slate-400 hover:bg-slate-700/80 rounded-lg transition-colors"
                  title={`${t('Previous product')} (←)`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="p-1.5 hover:text-white text-slate-400 hover:bg-slate-700/80 rounded-lg transition-colors"
                  title={`${t('Next product')} (→)`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              aria-label={t('Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 pb-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column (5 cols): Gallery + Thumbnails */}
            <div className="lg:col-span-5 flex flex-col space-y-3">
              <div className="w-full aspect-square max-h-[380px] bg-gradient-to-b from-slate-800/60 to-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center relative mx-auto shrink-0 shadow-inner">
                <WishlistButton productId={product.id} />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevIdx = (activeImgIdx - 1 + images.length) % images.length;
                        setActiveImage(images[prevIdx]);
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur border border-slate-700 flex items-center justify-center opacity-85 hover:opacity-100 transition-all z-10"
                      title={t('Previous image')}
                      aria-label={t('Previous image')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIdx = (activeImgIdx + 1) % images.length;
                        setActiveImage(images[nextIdx]);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur border border-slate-700 flex items-center justify-center opacity-85 hover:opacity-100 transition-all z-10"
                      title={t('Next image')}
                      aria-label={t('Next image')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-3 right-3 z-10 bg-slate-950/85 border border-slate-700/80 text-slate-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full tabular-nums">
                      {activeImgIdx + 1} / {images.length}
                    </span>
                  </>
                )}

                {activeImage ? (
                  <ImageMagnifier src={activeImage} alt={product.sverigeTitle || product.title} />
                ) : (
                  <PackageSearch className="w-16 h-16 text-slate-600" />
                )}

                {product.isSponsored && (
                  <div className="absolute top-3 right-3 bg-[#ffcc00] text-slate-950 text-[10px] uppercase font-black px-2.5 py-1 rounded-md shadow-sm tracking-wider z-10">
                    {t('Sponsored')}
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="thumbnails-container flex gap-2 overflow-x-auto py-1 px-0.5 custom-scrollbar shrink-0">
                  {images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 bg-slate-950 transition-all ${
                        activeImage === img
                          ? 'border-cyan-400 ring-2 ring-cyan-400/25 opacity-100'
                          : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${product.title} - ${idx + 1}`} className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column (7 cols): B2B Trade Specs, Tiers & 1-Step Quote */}
            <div className="lg:col-span-7 space-y-5">
              {/* Supplier + Badges + Title */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    {sellerId ? (
                      <Link
                        to={`/company/${sellerId}`}
                        onClick={onClose}
                        className="hover:text-cyan-300 transition-colors"
                      >
                        {product.seller?.companyName || 'Verified Supplier'}
                      </Link>
                    ) : (
                      <span>{product.seller?.companyName || 'Verified Supplier'}</span>
                    )}
                    <VerificationBadge status={product.seller?.verificationStatus} />
                  </div>

                  {langMeta && (
                    <span className="bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                      {langMeta.flag} {languageLabel(product.language)}
                    </span>
                  )}

                  {product.sealedType && (
                    <span className="bg-slate-800/80 text-slate-300 border border-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {sealedTypeLabel(product.sealedType)}
                    </span>
                  )}

                  {product.offersOem && (
                    <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                      <Factory className="w-3.5 h-3.5" />
                      {t('OEM / Custom Branding')}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-snug mb-2">
                  {product.sverigeTitle || product.title}
                </h1>
                {product.description && (
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Key Trade Facts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {!hideMOQ && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                      {t('Min. Order (MOQ)')}
                    </span>
                    <span className="text-slate-100 text-sm font-bold tabular-nums">
                      {defaultMoq} {t('units')}
                    </span>
                  </div>
                )}
                {!hideMOQ && product.offersOem && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/20">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-cyan-400/80 mb-0.5">
                      {t('OEM Custom MOQ')}
                    </span>
                    <span className="text-cyan-200 text-sm font-bold tabular-nums">
                      {oemMoqVal} {t('units')}
                    </span>
                  </div>
                )}
                {product.originType && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                      {t('Dispatch / Origin')}
                    </span>
                    <span className="text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{product.originType}</span>
                    </span>
                  </div>
                )}
                {product.leadTimeDays ? (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                      {t('Lead Time')}
                    </span>
                    <span className="text-slate-200 text-sm font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {product.leadTimeDays} {t('days')}
                    </span>
                  </div>
                ) : null}
                {product.brand && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                      {t('Brand')}
                    </span>
                    <span className="text-slate-200 text-sm font-semibold truncate block">{product.brand}</span>
                  </div>
                )}
                {typeof product.stockQuantity === 'number' && product.stockQuantity > 0 && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                      {t('Available Stock')}
                    </span>
                    <span className="text-emerald-400 text-sm font-bold tabular-nums">
                      {product.stockQuantity.toLocaleString()} {t('units')}
                    </span>
                  </div>
                )}
              </div>

              {/* Volume Pricing & Interactive Quantity Calculator */}
              {hideMOQ ? (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 uppercase tracking-wider text-xs font-bold">{t('Price')}</span>
                  <span className="text-2xl font-mono font-bold text-cyan-400">
                    {product.sverigePrice || product.unitCost} kr
                  </span>
                </div>
              ) : (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      {tiers.length > 0 ? t('Wholesale Volume Tiers') : t('Wholesale Unit Pricing')}
                    </h3>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 mr-1.5">{t('Active PPU')}:</span>
                      <span className="text-lg font-extrabold font-mono text-cyan-300">
                        {activeUnitPrice === null ? t('Quote on Request') : formatPrice(activeUnitPrice)}
                      </span>
                    </div>
                  </div>

                  {tiers.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {tiers.map((tier: any, idx: number) => {
                        const minQ = Number(tier.minQty ?? tier.quantity ?? 1);
                        const maxQ = tier.maxQty ? Number(tier.maxQty) : null;
                        const tPrice = Number(tier.price ?? tier.unitPrice ?? 0);
                        const isCurrentTier =
                          orderQty >= minQ && (maxQ ? orderQty <= maxQ : idx === tiers.length - 1 || orderQty < Number(tiers[idx + 1]?.minQty ?? Infinity));
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setOrderQty(minQ)}
                            className={`text-left p-2.5 rounded-xl border transition-all ${
                              isCurrentTier
                                ? 'bg-cyan-500/15 border-cyan-400/50 text-white shadow-sm'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="text-[11px] text-slate-400 font-semibold tabular-nums">
                              {minQ}
                              {maxQ ? `–${maxQ}` : '+'} {t('units')}
                            </div>
                            <div className="text-sm font-extrabold font-mono text-white mt-0.5">
                              {tPrice > 0 ? formatPrice(tPrice) : t('Negotiate')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Interactive Order Quantity Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-400">{t('Order Qty')}:</label>
                      <input
                        type="number"
                        min={1}
                        value={orderQty}
                        onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value || '1', 10) || 1))}
                        className="w-24 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-white outline-none"
                      />
                      <span className="text-xs text-slate-500">{t('units')}</span>
                    </div>
                    {activeUnitPrice !== null && (
                      <div className="text-xs text-slate-300">
                        {t('Est. Subtotal')}:{' '}
                        <span className="font-mono font-extrabold text-white text-sm">
                          {formatPrice(activeUnitPrice * orderQty)}
                        </span>
                      </div>
                    )}
                  </div>

                  {activeUnitPrice !== null && (
                    <LandedCostEstimator quantity={orderQty} currentPrice={activeUnitPrice} />
                  )}
                </div>
              )}

              {/* Inline 1-Step Quote / OEM / Sample Request Composer */}
              {!hideMOQ && quoteOpen && (
                <form
                  onSubmit={submitDirectRFQ}
                  className="bg-gradient-to-b from-cyan-950/30 to-slate-950/90 border border-cyan-500/35 rounded-2xl p-4 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('Direct Supplier Inquiry')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteOpen(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {t('Cancel')}
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleModeSelect('wholesale')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        quoteMode === 'wholesale'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('Wholesale')} (≥{defaultMoq})
                    </button>
                    <button
                      type="button"
                      disabled={!product.offersOem}
                      onClick={() => handleModeSelect('oem')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-35 ${
                        quoteMode === 'oem'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('OEM Custom')} {product.offersOem ? `(≥${oemMoqVal})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeSelect('sample')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        quoteMode === 'sample'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('Paid Sample')} (1–5)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('Quantity')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={orderQty}
                        onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value || '1', 10) || 1))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('Target Total')} ({currency || 'EUR'})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={targetBudget}
                        onChange={(e) => setTargetBudget(e.target.value)}
                        placeholder={activeUnitPrice ? (activeUnitPrice * orderQty).toFixed(2) : t('Optional')}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('Destination')}
                      </label>
                      <select
                        value={shippingDest}
                        onChange={(e) => setShippingDest(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                      >
                        <option value="EU">Europe (EU)</option>
                        <option value="US">United States</option>
                        <option value="UK">United Kingdom</option>
                        <option value="NORDICS">Nordics / Sweden</option>
                        <option value="ASIA">Asia-Pacific</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {quoteMode === 'oem'
                        ? t('Custom Logo / Packaging Specifications')
                        : t('Message / Delivery Requirements')}
                    </label>
                    <textarea
                      rows={2}
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      placeholder={
                        quoteMode === 'oem'
                          ? t('Describe embossed/printed logo placement, pantone color, retail box packaging...')
                          : t('Optional notes on target delivery date, mixed case request, or VAT/shipping...')
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingInquiry}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-950/50 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingInquiry ? t('Sending...') : t('Send Official RFQ')}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Structured Specifications Table */}
              {Object.keys(specsObj).length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    {t('Technical Specifications')}
                  </h3>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
                    {Object.entries(specsObj).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-5 gap-3 px-4 py-2.5 text-xs sm:text-sm">
                        <span className="col-span-2 text-slate-400 font-medium">{key}</span>
                        <span className="col-span-3 text-slate-200 font-semibold text-right break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0 border-t border-slate-800 bg-slate-900/95 z-10">
          <div className="flex items-center gap-2">
            {handlePrev && handleNext && (
              <div className="flex sm:hidden items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {t('Prev')}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                >
                  {t('Next')}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
            {hideMOQ ? (
              onAddToCart && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart();
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors text-xs sm:text-sm"
                >
                  <Package className="w-4 h-4" />
                  {t('Add to Cart')}
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleAddToB2BCart(true)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 text-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ {t('Sample')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToB2BCart(false)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 text-xs"
                >
                  <Package className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    + {t('Cart')} ({Math.max(defaultMoq, orderQty)})
                  </span>
                </button>

                {user ? (
                  <button
                    type="button"
                    onClick={() => setQuoteOpen(prev => !prev)}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition-all text-xs sm:text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{quoteOpen ? t('Hide Quote Form') : t('Request Official Quote')}</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition-all text-xs sm:text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{t('Sign in to Request Quote')}</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
