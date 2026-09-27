import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Package, ShoppingCart, Tag, Zap } from 'lucide-react';

interface PreorderCardProps {
  product: any;
  onClick?: () => void;
  formatPrice: (price: number) => string;
  compact?: boolean;
}

function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number } | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, mins: 0 }); return; }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      setTimeLeft({ days, hours, mins });
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

export function PreorderCard({ product, onClick, formatPrice, compact = false }: PreorderCardProps) {
  let images: string[] = [];
  try { images = Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]'); } catch {}
  let tiers: any[] = [];
  try { tiers = Array.isArray(product.tieredPricing) ? product.tieredPricing : JSON.parse(product.tieredPricing || '[]'); } catch {}
  const tierPrices = tiers.map((t: any) => Number(t.price ?? t.unitPrice)).filter((n: number) => Number.isFinite(n) && n > 0);
  const basePrice = Number(product.unitCost ?? product.unitPrice);
  const lowestPrice = tierPrices.length > 0 ? Math.min(...tierPrices) : (Number.isFinite(basePrice) && basePrice > 0 ? basePrice : null);

  const estimatedDate = product.preorderEstimatedDate ? new Date(product.preorderEstimatedDate) : null;
  const timeLeft = useCountdown(estimatedDate);
  const isExpired = estimatedDate && Date.now() > estimatedDate.getTime();

  return (
    <div
      onClick={onClick}
      className={`group relative bg-slate-900 border rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300
        border-amber-500/40 hover:border-amber-400/70 hover:shadow-xl hover:shadow-amber-500/10
        ${compact ? '' : ''}`}
    >
      {/* Preorder shimmer glow bar */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

      {/* Image area */}
      <div className="aspect-[4/3] bg-slate-800 overflow-hidden relative">
        {images[0]
          ? <img src={images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
          : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-950/40 to-slate-800">
              <Package className="w-10 h-10 text-amber-600/50" />
            </div>
          )
        }

        {/* Preorder badge */}
        <div className="absolute top-2 left-2">
          <span className="flex items-center gap-1 bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">
            <Clock className="w-2.5 h-2.5" />
            Pre-Order
          </span>
        </div>

        {/* MOQ badge */}
        <div className="absolute top-2 right-2">
          <span className="bg-slate-900/90 backdrop-blur text-slate-300 text-[10px] font-semibold px-2 py-1 rounded-full border border-slate-700">
            MOQ: {product.moq || '—'}
          </span>
        </div>

        {/* Overlay scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

        {/* Countdown inside image */}
        {timeLeft && !isExpired && (
          <div className="absolute bottom-2 inset-x-2">
            <div className="bg-slate-900/90 backdrop-blur border border-amber-500/30 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Est. availability
              </span>
              <div className="flex items-center gap-2">
                {timeLeft.days > 0 && (
                  <span className="tabular-nums text-white text-[11px] font-bold">{timeLeft.days}d</span>
                )}
                <span className="tabular-nums text-white text-[11px] font-bold">{timeLeft.hours}h</span>
                <span className="tabular-nums text-amber-400 text-[11px] font-bold">{timeLeft.mins}m</span>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="absolute bottom-2 inset-x-2">
            <div className="bg-emerald-500/20 backdrop-blur border border-emerald-500/40 rounded-xl px-3 py-2 flex items-center justify-center gap-2">
              <span className="text-emerald-400 text-[11px] font-semibold">🚀 Becoming available soon</span>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-100 line-clamp-2 mb-1 group-hover:text-amber-300 transition-colors text-sm">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2 flex-1">{product.description}</p>
        )}

        {/* Estimated date label */}
        {product.preorderLabel && (
          <div className="flex items-center gap-1.5 mb-3">
            <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-400/80 font-medium">{product.preorderLabel}</span>
          </div>
        )}

        {/* Product Meta Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {product.brand && (
            <span className="text-[10px] bg-[#ffcc00]/10 border border-[#ffcc00]/20 text-[#ffcc00] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              {product.brand}
            </span>
          )}
          {product.sealedType && product.sealedType !== 'other' && (
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full capitalize">
              {product.sealedType.replace('_', ' ')}
            </span>
          )}
          {(product.categoryName || product.category) && (
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
              {product.categoryName || product.category}
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-amber-500/10">
          {lowestPrice ? (
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-amber-500/70 uppercase tracking-wider mb-0.5">Pre-order price</div>
                <div className="text-base font-bold text-amber-300">
                  {formatPrice(lowestPrice)}
                  <span className="text-slate-500 text-xs font-normal">/unit</span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                <ShoppingCart className="w-3 h-3" />
                Reserve
              </div>
            </div>
          ) : (
            <div className="text-sm font-medium text-amber-400/70">Price on request</div>
          )}
        </div>
      </div>
    </div>
  );
}
