import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import { X, PackageSearch, Star, Building2, MapPin, Package, Clock, ShieldCheck, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from './CurrencyContext.tsx';
import { WishlistButton } from './WishlistButton.tsx';

export function ProductModal({ product, onClose }: { product: any, onClose: () => void }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

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

  const [activeImage, setActiveImage] = useState(product?.images?.[0] || null);

  React.useEffect(() => {
    setActiveImage(product?.images?.[0] || null);
  }, [product]);

  if (!product) return null;

 return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur z-10 sticky top-0">
          <h2 className="text-xl font-bold text-white line-clamp-1 pr-8">{product.title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors absolute right-4"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Images */}
            <div className="space-y-4">
              <div className="aspect-square bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center relative">
                <WishlistButton productId={product.id} />
                {activeImage ? (
                  <img src={activeImage} alt={product.title} className="w-full h-full object-contain" />
                ) : (
                  <PackageSearch className="w-20 h-20 text-slate-600" />
                )}
                {product.isSponsored && (
                  <div className="absolute top-4 left-4 bg-[#ffcc00] text-black text-xs uppercase font-black px-3 py-1 rounded shadow-sm tracking-wider">
                    Sponsored
                  </div>
                )}
              </div>
              
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {product.images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${activeImage === img ? 'border-[#ffcc00]' : 'border-transparent hover:border-slate-500'}`}
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
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('MOQ')}</span>
                  <span className="text-slate-200 font-medium">{product.moq} {t('units')}</span>
                </div>
              </div>

              {/* Tiered Pricing */}
              {product.tieredPricing && product.tieredPricing.length > 0 ? (
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
                  <span className="text-slate-400 uppercase tracking-wider text-xs font-bold">{t('Unit Price')}</span>
                  <span className="text-2xl font-mono font-bold text-white">{formatPrice(product.unitCost || 0)}</span>
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {t('Close')}
          </button>
          <button className="px-6 py-2.5 bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
            <Mail className="w-4 h-4" />
            {t('Contact Supplier')}
          </button>
        </div>

      </div>
    </div>
  );
}
