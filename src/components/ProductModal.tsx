import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import { X, PackageSearch, Star, Building2, MapPin, Package, Clock, ShieldCheck, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from './CurrencyProvider.tsx';
import { WishlistButton } from './WishlistButton.tsx';
import { ImageMagnifier } from './ImageMagnifier.tsx';

export interface ProductModalProps {
  product: any;
  onClose: () => void;
  hideMOQ?: boolean;
  onAddToCart?: () => void;
  onPrevProduct?: () => void;
  onNextProduct?: () => void;
  productIndex?: number;
  totalProducts?: number;
}

export function ProductModal({
  product,
  onClose,
  hideMOQ = false,
  onAddToCart,
  onPrevProduct,
  onNextProduct,
  productIndex,
  totalProducts
}: ProductModalProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isCreatingInquiry, setIsCreatingInquiry] = useState(false);

  const createInquiry = async (isSample = false) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsCreatingInquiry(true);
    try {
      const res = await fetch('/api-v2/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({
          targetProductId: product.id,
          quantity: isSample ? 1 : (product.moq || 1),
          targetBudget: isSample ? ((product.unitCost || 0) * 2).toFixed(2) : undefined,
          status: 'Draft',
          aiNotes: isSample ? 'Buyer has requested a sample of this product.' : undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/rfq/${data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingInquiry(false);
    }
  };

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['productReviews', product.id],
    queryFn: () => fetch(`/api-v2/products/${product.id}/reviews`).then(res => res.json())
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api-v2/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await user?.getIdToken()}` },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });
      if (!res.ok) throw new Error("Failed to submit review");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productReviews', product.id] });
      setReviewComment("");
    }
  });

  const images: string[] = (product?.sverigeImages && product.sverigeImages.length > 0)
    ? product.sverigeImages
    : (product?.images && product.images.length > 0 ? product.images : []);

  const [activeImage, setActiveImage] = useState<string | null>(images[0] || null);

  React.useEffect(() => {
    const currentImgs: string[] = (product?.sverigeImages && product.sverigeImages.length > 0)
      ? product.sverigeImages
      : (product?.images && product.images.length > 0 ? product.images : []);
    setActiveImage(currentImgs[0] || null);
  }, [product]);

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
      if (deltaX < 0 && onNextProduct) {
        onNextProduct();
      } else if (deltaX > 0 && onPrevProduct) {
        onPrevProduct();
      }
    }
  };

  // Keyboard navigation for product to product
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && onPrevProduct) {
        e.preventDefault();
        onPrevProduct();
      } else if (e.key === 'ArrowRight' && onNextProduct) {
        e.preventDefault();
        onNextProduct();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevProduct, onNextProduct, onClose]);

  if (!product) return null;

 return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Floating Left Arrow (Product to Product) */}
      {onPrevProduct && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrevProduct(); }}
          aria-label="Föregående produkt"
          title="Föregående produkt (←)"
          className="hidden md:flex absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 w-11 h-11 lg:w-13 lg:h-13 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-2xl items-center justify-center transition-all hover:scale-110 active:scale-95 z-30 group"
        >
          <ChevronLeft className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
        </button>
      )}

      {/* Floating Right Arrow (Product to Product) */}
      {onNextProduct && (
        <button
          onClick={(e) => { e.stopPropagation(); onNextProduct(); }}
          aria-label="Nästa produkt"
          title="Nästa produkt (→)"
          className="hidden md:flex absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 w-11 h-11 lg:w-13 lg:h-13 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white shadow-2xl items-center justify-center transition-all hover:scale-110 active:scale-95 z-30 group"
        >
          <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
        </button>
      )}

      <div 
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-20 sticky top-0 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            <h2 className="text-base sm:text-xl font-bold text-white truncate">{product.sverigeTitle || product.title}</h2>
            {totalProducts && totalProducts > 1 && (
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium whitespace-nowrap">
                {productIndex} / {totalProducts}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Prev / Next Arrows */}
            {onPrevProduct && onNextProduct && (
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onPrevProduct(); }}
                  className="p-1 hover:text-white text-slate-400 hover:bg-slate-700/80 rounded transition-colors"
                  title="Föregående produkt (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onNextProduct(); }}
                  className="p-1 hover:text-white text-slate-400 hover:bg-slate-700/80 rounded transition-colors"
                  title="Nästa produkt (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Stäng"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 pb-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Left: Images */}
            <div className="flex flex-col space-y-3">
              {/* Main Image */}
              <div className="w-full max-h-[280px] sm:max-h-[340px] md:max-h-[380px] aspect-square bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center relative mx-auto shrink-0 shadow-inner">
                <WishlistButton productId={product.id} />

                {/* Photo cycle arrows if product has multiple images */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const currIdx = images.indexOf(activeImage || '');
                        const prevIdx = (currIdx - 1 + images.length) % images.length;
                        setActiveImage(images[prevIdx]);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur border border-slate-700 flex items-center justify-center opacity-80 hover:opacity-100 transition-all z-10"
                      title="Föregående bild"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const currIdx = images.indexOf(activeImage || '');
                        const nextIdx = (currIdx + 1) % images.length;
                        setActiveImage(images[nextIdx]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur border border-slate-700 flex items-center justify-center opacity-80 hover:opacity-100 transition-all z-10"
                      title="Nästa bild"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {activeImage ? (
                  <ImageMagnifier src={activeImage} alt={product.sverigeTitle || product.title} />
                ) : (
                  <PackageSearch className="w-20 h-20 text-slate-600" />
                )}
                {product.isSponsored && (
                  <div className="absolute top-4 left-4 bg-[#ffcc00] text-black text-xs uppercase font-black px-3 py-1 rounded shadow-sm tracking-wider z-10">
                    Sponsored
                  </div>
                )}
              </div>
              
              {/* Thumbnails Row */}
              {images.length > 1 && (
                <div className="thumbnails-container flex gap-2.5 overflow-x-auto py-1 px-0.5 custom-scrollbar shrink-0">
                  {images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all shadow-sm ${
                        activeImage === img 
                          ? 'border-cyan-400 ring-2 ring-cyan-400/30 scale-102' 
                          : 'border-slate-700/80 hover:border-slate-500 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${product.title} - ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Right: Details */}
            <div className="space-y-6">
              
              <div>
                <div className="flex items-center gap-2 text-slate-400 mb-2 text-sm">
                  <Building2 className="w-4 h-4" />
                  <span>{product.seller?.companyName || 'Independent Seller'}</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{product.title}</h1>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">{product.description}</p>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {product.brand && (
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('Brand')}</span>
                    <span className="text-slate-200 font-medium">{product.brand}</span>
                  </div>
                )}
                {product.category && (
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('Category')}</span>
                    <span className="text-slate-200 font-medium">{product.category}</span>
                  </div>
                )}
                {product.originType && (
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('Origin')}</span>
                    <span className="text-slate-200 font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> {product.originType}</span>
                  </div>
                )}
                {product.leadTimeDays && (
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('Lead Time')}</span>
                    <span className="text-slate-200 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {product.leadTimeDays} {t('days')}</span>
                  </div>
                )}
                {product.stockQuantity !== undefined && (
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('Stock Quantity')}</span>
                    <span className="text-slate-200 font-medium flex items-center gap-1"><Package className="w-3 h-3" /> {product.stockQuantity}</span>
                  </div>
                )}
                {!hideMOQ && (
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('MOQ')}</span>
                    <span className="text-slate-200 font-medium">{product.moq} {t('units')}{product.offersOem ? ` (Generic) | ${product.oemMoq} units (OEM)` : ''}</span>
                  </div>
                )}
              </div>

              {/* Pricing */}
              {hideMOQ ? (
                <div className="mt-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                  <span className="text-slate-400 uppercase tracking-wider text-xs font-bold">{t('Price')}</span>
                  <span className="text-2xl font-mono font-bold text-cyan-400">{(product.sverigePrice || product.unitCost)} kr</span>
                </div>
              ) : product.tieredPricing && product.tieredPricing.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#ffcc00]" />
                    {t('Volume Pricing')}
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-700">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-800 text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">{t('Quantity')}</th>
                          <th className="px-4 py-3 font-medium text-right">{t('Price')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 bg-slate-900/50">
                        {product.tieredPricing.map((tier: any, idx: number) => {
                          const minQ = tier.minQty ?? tier.quantity ?? 0;
                          const maxQ = tier.maxQty;
                          const tPrice = tier.price ?? tier.unitPrice ?? 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                              <td className="px-4 py-3 text-slate-300">
                                {minQ}{maxQ ? ` - ${maxQ}` : '+'} {t('units')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-medium text-white">
                                {formatPrice(tPrice)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mt-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                  <span className="text-slate-400 uppercase tracking-wider text-xs font-bold">{t('Estimated Price Per Unit')}</span>
                  <span className="text-2xl font-mono font-bold text-white">{(!product.unitCost || Number(product.unitCost) === 0) ? t("Negotiate") : formatPrice(Number(product.unitCost))}</span>
                </div>
              )}

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">{t('Specifications')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 border-b border-slate-800 py-2">
                        <span className="text-slate-500 text-sm shrink-0">{key}</span>
                        <span className="text-slate-300 text-sm font-medium text-right break-words min-w-0">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between shrink-0 border-t border-slate-800 bg-slate-900 z-10 relative">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onPrevProduct && onNextProduct && (
              <div className="flex sm:hidden items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onPrevProduct(); }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="Föregående produkt"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {t('Prev', 'Föregående')}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onNextProduct(); }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="Nästa produkt"
                >
                  {t('Next', 'Nästa')}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onClose}
              className="btn-ghost"
            >
              {t('Close')}
            </button>
            {hideMOQ ? (
              onAddToCart && (
                <button 
                  onClick={() => {
                    onAddToCart();
                    onClose();
                  }}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors text-sm sm:text-base"
                >
                  <Package className="w-4 h-4" />
                  {t('Add to Cart', 'Lägg i varukorg')}
                </button>
              )
            ) : (
              <>
                <button 
                  onClick={() => createInquiry(true)}
                  disabled={isCreatingInquiry}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors border border-slate-600 disabled:opacity-50 text-sm"
                >
                  <Package className="w-4 h-4" />
                  {t('Request Sample')}
                </button>
                <button 
                  onClick={() => createInquiry(false)}
                  disabled={isCreatingInquiry}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                >
                  <Mail className="w-4 h-4" />
                  {t('Contact Supplier')}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
