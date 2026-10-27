import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Filter,
  PackageSearch,
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  SlidersHorizontal,
  Shield,
  Search,
  Sparkles,
  LayoutGrid,
  List,
  Layers,
  Camera,
  Factory,
  ShoppingBag,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { languageLabel, sealedTypeLabel, PRODUCT_LANGUAGES, originTypeShort } from '../lib/productTaxonomy.ts';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { useCurrency } from '../components/CurrencyProvider.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { ProductModal } from '../components/ProductModal.tsx';
import { WishlistButton } from '../components/WishlistButton.tsx';
import { VerificationBadge } from '../components/VerificationBadge.tsx';
import { BrowseSections } from '../components/BrowseSections.tsx';

const COUNTRY_FLAGS: Record<string, string> = {
  'China': '🇨🇳',
  'Italy': '🇮🇹',
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'Sweden': '🇸🇪',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'United Kingdom': '🇬🇧',
  'France': '🇫🇷',
  'Netherlands': '🇳🇱',
  'Spain': '🇪🇸',
};

const flagFor = (country?: string | null) => (country && COUNTRY_FLAGS[country]) || '🌐';

function parseImages(raw: any): string[] {
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter((u: any) => typeof u === 'string' && u.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function parseTiers(raw: any): any[] {
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function extractMinUnitPrice(p: any, tiers: any[]): number | null {
  if (tiers.length > 0) {
    const valid = tiers
      .map((t: any) => parseFloat(String(t?.price ?? t?.unitPrice ?? '')))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    if (valid.length > 0) return Math.min(...valid);
  }
  const direct = parseFloat(String(p?.unitCost ?? p?.unitPrice ?? ''));
  return Number.isFinite(direct) && direct > 0 ? direct : null;
}

function extractSpecHighlights(rawSpecs: any): string[] {
  if (!rawSpecs) return [];
  try {
    const obj = typeof rawSpecs === 'string' ? JSON.parse(rawSpecs) : rawSpecs;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    const priorityKeys = ['Thickness', 'thickness', 'Capacity', 'capacity', 'Material', 'material', 'Dimensions', 'dimensions', 'Size', 'size', 'Case Config', 'Pack Config'];
    const picked: string[] = [];
    for (const k of priorityKeys) {
      if (obj[k] && String(obj[k]).trim()) {
        const val = String(obj[k]).trim();
        if (val.length <= 28) picked.push(val);
        if (picked.length >= 2) return picked;
      }
    }
    for (const [, v] of Object.entries(obj)) {
      if (v && typeof v !== 'object') {
        const val = String(v).trim();
        if (val && val.length <= 24 && !picked.includes(val)) {
          picked.push(val);
          if (picked.length >= 2) break;
        }
      }
    }
    return picked;
  } catch {
    return [];
  }
}

/* ---------- Flagship B2B Product Card ---------- */
const ProductCard = ({
  p,
  formatPrice,
  t,
  isSponsored = false,
  onSelect,
  onQuickAddSample,
}: {
  p: any;
  formatPrice: (n: number) => string;
  t: (k: string) => string;
  isSponsored?: boolean;
  onSelect: (product: any) => void;
  onQuickAddSample: (product: any, image: string, minPrice: number | null, e: React.MouseEvent) => void;
}) => {
  const [imgError, setImgError] = useState(false);
  const [hoverImgError, setHoverImgError] = useState(false);

  if (!p) return null;

  const images = parseImages(p.images);
  const tiers = parseTiers(p.tieredPricing);
  const minPrice = extractMinUnitPrice(p, tiers);
  const specs = extractSpecHighlights(p.specifications);
  const langMeta = p.language ? PRODUCT_LANGUAGES.find(x => x.value === p.language) : null;
  const primaryImg = !imgError && images[0] ? images[0] : null;
  const secondaryImg = !hoverImgError && images.length > 1 ? images[1] : null;
  const sellerId = p.seller?.id || p.sellerId;
  const sellerName = p.seller?.companyName || 'Verified Supplier';

  return (
    <article
      onClick={() => onSelect(p)}
      className={`group cursor-pointer rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 bg-slate-900/90 backdrop-blur-sm ${
        isSponsored
          ? 'border border-[#ffcc00]/50 shadow-[0_0_24px_rgba(255,204,0,0.08)] hover:border-[#ffcc00]'
          : 'border border-slate-800/90 hover:border-cyan-500/45 hover:shadow-xl hover:shadow-cyan-950/30 hover:-translate-y-0.5'
      }`}
    >
      {/* Wishlist heart (top-left) */}
      <WishlistButton productId={p.id} />

      {/* Top-right status badges */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
        {isSponsored && (
          <span className="bg-[#ffcc00] text-slate-950 text-[10px] uppercase font-black px-2 py-0.5 rounded-md shadow-sm tracking-wider">
            {t('Sponsored')}
          </span>
        )}
        {langMeta && (
          <span
            title={languageLabel(p.language)}
            className="bg-slate-950/85 backdrop-blur-md text-slate-100 border border-slate-700/80 text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm"
          >
            <span>{langMeta.flag}</span>
            <span>{langMeta.short}</span>
          </span>
        )}
        {p.offersOem && (
          <span className="bg-cyan-500/15 backdrop-blur-md text-cyan-300 border border-cyan-400/35 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1 shadow-sm">
            <Factory className="w-3 h-3" />
            OEM
          </span>
        )}
      </div>

      {/* Studio-lit product stage */}
      <div className="relative aspect-[4/3] bg-gradient-to-b from-slate-800/50 via-slate-900/70 to-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800/70">
        {primaryImg ? (
          <>
            <img
              src={primaryImg}
              alt={p.title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className={`w-full h-full object-contain p-3 transition-all duration-500 ${
                secondaryImg ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'
              }`}
            />
            {secondaryImg && (
              <img
                src={secondaryImg}
                alt={`${p.title} alternate view`}
                loading="lazy"
                decoding="async"
                onError={() => setHoverImgError(true)}
                className="absolute inset-0 w-full h-full object-contain p-3 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 gap-1.5">
            <PackageSearch className="w-10 h-10" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">{t('No Preview')}</span>
          </div>
        )}

        {/* Gallery count badge (bottom-left) */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-700/70 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full pointer-events-none">
            <Camera className="w-3 h-3 text-cyan-400" />
            <span className="tabular-nums">{images.length}</span>
          </div>
        )}

        {/* Quick Sample Add (bottom-right on hover) */}
        <button
          type="button"
          onClick={(e) => onQuickAddSample(p, primaryImg || '', minPrice, e)}
          title={t('Add sample to B2B cart')}
          className="absolute bottom-2.5 right-2.5 z-20 inline-flex items-center gap-1 bg-slate-950/85 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/35 hover:border-cyan-400 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-all shadow-lg"
        >
          <ShoppingBag className="w-3 h-3" />
          <span>+ {t('Sample')}</span>
        </button>
      </div>

      {/* Structured B2B Card Body */}
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Supplier Eyebrow */}
        <div className="flex items-center justify-between gap-2 text-xs min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 text-xs" title={p.seller?.country || undefined}>
              {p.seller?.country ? flagFor(p.seller.country) : <Building2 className="w-3.5 h-3.5 text-slate-500" />}
            </span>
            {sellerId ? (
              <Link
                to={`/company/${sellerId}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-slate-300 hover:text-cyan-300 transition-colors font-semibold"
              >
                {sellerName}
              </Link>
            ) : (
              <span className="truncate text-slate-400 font-medium">{sellerName}</span>
            )}
            <VerificationBadge status={p.seller?.verificationStatus} />
          </div>
          {p.originType && (
            <span className="shrink-0 text-[10px] font-semibold text-slate-400 bg-slate-800/80 border border-slate-700/70 px-1.5 py-0.5 rounded">
              {originTypeShort(p.originType)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] leading-snug font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 min-h-[40px]">
          {p.title}
        </h3>

        {/* Concise Spec / Format Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {p.sealedType ? (
            <span className="bg-slate-800/90 text-slate-200 text-[11px] px-2 py-0.5 rounded-md border border-slate-700/80 font-medium">
              {sealedTypeLabel(p.sealedType)}
            </span>
          ) : p.category ? (
            <span className="bg-slate-800/90 text-slate-200 text-[11px] px-2 py-0.5 rounded-md border border-slate-700/80 font-medium">
              {p.category}
            </span>
          ) : null}

          {specs.slice(0, 2).map((s, idx) => (
            <span
              key={idx}
              className="bg-slate-950/70 text-slate-400 text-[10px] px-2 py-0.5 rounded-md border border-slate-800 font-medium truncate max-w-[130px]"
            >
              {s}
            </span>
          ))}

          {specs.length === 0 && p.description && (
            <span className="text-[11px] text-slate-400 line-clamp-1">
              {p.description}
            </span>
          )}
        </div>

        {/* B2B Trade Footer: Price + MOQ */}
        <div className="mt-auto pt-3 border-t border-slate-800/80 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                {t('Est. PPU')}
              </span>
              {tiers.length > 1 && (
                <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 rounded">
                  {tiers.length} {t('tiers')}
                </span>
              )}
            </div>
            <div className="text-lg font-extrabold text-white font-mono tracking-tight leading-tight mt-0.5">
              {minPrice === null ? (
                <span className="text-xs font-sans font-bold text-cyan-400 uppercase tracking-wider">
                  {t('Quote on Request')}
                </span>
              ) : (
                formatPrice(minPrice)
              )}
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[11px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider tabular-nums">
              MOQ {p.moq || 1}
            </span>
            {p.offersOem && p.oemMoq ? (
              <span className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                OEM ≥ {p.oemMoq}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400/80 mt-0.5 inline-flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" /> Escrow
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

/* ---------- High-Density B2B Line-Sheet Row ---------- */
const ProductLineRow = ({
  p,
  formatPrice,
  t,
  onSelect,
  onQuickAddSample,
}: {
  p: any;
  formatPrice: (n: number) => string;
  t: (k: string) => string;
  onSelect: (p: any) => void;
  onQuickAddSample: (product: any, image: string, minPrice: number | null, e: React.MouseEvent) => void;
}) => {
  const [imgError, setImgError] = useState(false);
  const images = parseImages(p?.images);
  const tiers = parseTiers(p?.tieredPricing);
  const minPrice = extractMinUnitPrice(p, tiers);
  const specs = extractSpecHighlights(p?.specifications);
  const langMeta = p?.language ? PRODUCT_LANGUAGES.find(x => x.value === p.language) : null;
  const primaryImg = !imgError && images[0] ? images[0] : null;
  const sellerId = p?.seller?.id || p?.sellerId;

  return (
    <div
      onClick={() => onSelect(p)}
      className="group cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all"
    >
      {/* Thumbnail */}
      <div className="w-full sm:w-20 h-32 sm:h-20 rounded-xl bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden relative">
        {primaryImg ? (
          <img
            src={primaryImg}
            alt={p.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform"
          />
        ) : (
          <PackageSearch className="w-6 h-6 text-slate-600" />
        )}
        {images.length > 1 && (
          <span className="absolute bottom-1 right-1 bg-slate-950/85 text-slate-300 text-[9px] font-bold px-1.5 rounded border border-slate-700/70 tabular-nums">
            {images.length}p
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {p.isSponsored && (
            <span className="bg-[#ffcc00] text-slate-950 text-[9px] uppercase font-black px-1.5 py-0.5 rounded">
              {t('Sponsored')}
            </span>
          )}
          {langMeta && (
            <span className="bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
              {langMeta.flag} {langMeta.short}
            </span>
          )}
          {p.offersOem && (
            <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
              OEM {p.oemMoq ? `≥ ${p.oemMoq}` : ''}
            </span>
          )}
          {(p.sealedType || p.category) && (
            <span className="text-[11px] text-slate-400 font-medium">
              {p.sealedType ? sealedTypeLabel(p.sealedType) : p.category}
            </span>
          )}
        </div>

        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
          {p.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 font-medium text-slate-300">
            <span>{flagFor(p.seller?.country)}</span>
            {sellerId ? (
              <Link
                to={`/company/${sellerId}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-cyan-300 transition-colors"
              >
                {p.seller?.companyName || 'Supplier'}
              </Link>
            ) : (
              <span>{p.seller?.companyName || 'Supplier'}</span>
            )}
            <VerificationBadge status={p.seller?.verificationStatus} />
          </span>
          {specs.map((s, i) => (
            <span key={i} className="text-slate-500">
              • {s}
            </span>
          ))}
        </div>
      </div>

      {/* Pricing & MOQ Columns */}
      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
        <div className="text-left sm:text-right">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">MOQ</div>
          <div className="text-sm font-bold text-indigo-300 tabular-nums">{p.moq || 1} pcs</div>
        </div>

        <div className="text-left sm:text-right min-w-[96px]">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            {tiers.length > 1 ? `${tiers.length} Vol. Tiers` : t('Est. PPU')}
          </div>
          <div className="text-base font-extrabold text-white font-mono tabular-nums">
            {minPrice === null ? (
              <span className="text-xs font-sans font-bold text-cyan-400">{t('Negotiate')}</span>
            ) : (
              formatPrice(minPrice)
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => onQuickAddSample(p, primaryImg || '', minPrice, e)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors inline-flex items-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">{t('Sample')}</span>
          </button>
          <span className="px-3 py-2 rounded-xl bg-cyan-500/15 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 border border-cyan-500/30 text-xs font-bold transition-all inline-flex items-center gap-1">
            <span>{t('Quote')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};

/* ---------- Sidebar building blocks ---------- */
const FilterSection = ({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800/80 last:border-b-0 pb-4 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1.5 text-left group"
      >
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider group-hover:text-white transition-colors flex items-center gap-2">
          {title}
          {count ? (
            <span className="bg-cyan-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none tabular-nums">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2 space-y-1">{children}</div>}
    </div>
  );
};

const FacetCheckbox = ({
  label,
  count,
  checked,
  onChange,
  prefix,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
  prefix?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onChange}
    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-sm transition-all ${
      checked
        ? 'bg-cyan-500/15 text-white border border-cyan-500/35 font-semibold'
        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
    }`}
  >
    <span className="flex items-center gap-2 min-w-0">
      <span
        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
          checked ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-600 bg-slate-900/80'
        }`}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </span>
      {prefix && <span className="shrink-0">{prefix}</span>}
      <span className="truncate text-[13px]">{label}</span>
    </span>
    {typeof count === 'number' && (
      <span className={`text-[11px] tabular-nums shrink-0 font-semibold ${checked ? 'text-cyan-300' : 'text-slate-500'}`}>
        {count}
      </span>
    )}
  </button>
);

const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <button
    type="button"
    onClick={onRemove}
    className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 hover:border-rose-500/50 hover:bg-rose-500/10 text-cyan-200 hover:text-rose-200 text-xs font-semibold px-3 py-1 rounded-full transition-colors"
  >
    <span>{label}</span>
    <X className="w-3 h-3" />
  </button>
);

const QUICK_SEARCH_TAGS = [
  { label: 'Acrylic Display Cases', q: 'Acrylic' },
  { label: '35PT Magnetic', q: '35PT' },
  { label: 'Toploader Binders', q: 'Toploader Binder' },
  { label: 'One Piece', q: 'One Piece' },
  { label: '30th Anniversary', q: '30th Anniversary' },
  { label: 'Booster Boxes', type: 'booster_box' },
];

const parseList = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
const PAGE_SIZE = 24;

export function Marketplace() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addItem, setCartOpen } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- URL-driven state (shareable & bookmarkable) ----
  const search = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const selectedLanguages = parseList(searchParams.get('lang'));
  const selectedTypes = parseList(searchParams.get('type'));
  const selectedCountries = parseList(searchParams.get('country'));
  const selectedCategoryId = searchParams.get('category') ? parseInt(searchParams.get('category') as string, 10) : null;
  const selectedSellerId = searchParams.get('seller') ? parseInt(searchParams.get('seller') as string, 10) : null;
  const oemOnly = searchParams.get('oem') === '1' || searchParams.get('oem') === 'true';
  const productScope = (searchParams.get('scope') as 'sealed' | 'graded' | 'all') || 'all';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minMoq = searchParams.get('minMoq') || '';
  const sortBy = searchParams.get('sort') || 'company_az';
  const explicitView = searchParams.get('view') as 'showroom' | 'grid' | 'list' | null;

  const [searchInput, setSearchInput] = useState(search);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({ 3: true, 4: true, 12: true });

  // Sync URL search -> input when navigating via chips or back button
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounce live typing into URL search query
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search.trim()) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      next.delete('page');
      setSearchParams(next, { replace: true });
    }, 320);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleCategory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateParams = (patch: Record<string, string | null | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: false });
  };

  const toggleInList = (key: string, current: string[], value: string) => {
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateParams({ [key]: next.join(',') });
  };

  const clearAll = () => {
    setSearchInput('');
    const next = new URLSearchParams();
    if (explicitView && explicitView !== 'showroom') next.set('view', explicitView);
    setSearchParams(next, { replace: false });
  };

  const handleQuickAddSample = (product: any, image: string, minPrice: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    const sid = Number(product?.seller?.id ?? product?.sellerId ?? 0);
    const sName = product?.seller?.companyName || 'Verified Supplier';
    addItem({
      productId: product.id,
      title: product.title,
      image: image || '',
      sellerId: sid,
      sellerName: sName,
      quantity: 1,
      moq: Number(product.moq) || undefined,
      unitCost: minPrice ?? Number(product.unitCost || 0),
    });
    toast.success(`Added "${product.title}" sample to cart`, {
      action: {
        label: t('Open Cart'),
        onClick: () => setCartOpen(true),
      },
    });
  };

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api-v2/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
    staleTime: 2 * 60_000,
  });

  const { data: facets = { languages: [], sealedTypes: [], countries: [], sellers: [], totalProducts: 0, oemCount: 0 } } = useQuery({
    queryKey: [
      'marketplace-facets',
      search,
      selectedLanguages.join(','),
      selectedTypes.join(','),
      selectedCountries.join(','),
      selectedCategoryId,
      selectedSellerId,
      oemOnly,
      productScope,
      maxPrice,
      minMoq,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ productType: productScope });
      if (search) params.set('q', search);
      if (selectedLanguages.length) params.set('languages', selectedLanguages.join(','));
      if (selectedTypes.length) params.set('sealedTypes', selectedTypes.join(','));
      if (selectedCountries.length) params.set('countries', selectedCountries.join(','));
      if (selectedCategoryId) params.set('category', String(selectedCategoryId));
      if (selectedSellerId) params.set('seller', String(selectedSellerId));
      if (oemOnly) params.set('oem', '1');
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minMoq) params.set('minMoq', minMoq);
      const res = await fetch(`/api-v2/marketplace/facets?${params.toString()}`);
      if (!res.ok) return { languages: [], sealedTypes: [], countries: [], sellers: [], totalProducts: 0, oemCount: 0 };
      return res.json();
    },
    staleTime: 60_000,
  });

  const categoryTree = React.useMemo(() => {
    if (!Array.isArray(categoriesData)) return [];
    const map = new Map<number, any>();
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
    roots.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return roots;
  }, [categoriesData]);

  const activeFilterCount =
    selectedLanguages.length +
    selectedTypes.length +
    selectedCountries.length +
    (selectedCategoryId ? 1 : 0) +
    (selectedSellerId ? 1 : 0) +
    (oemOnly ? 1 : 0) +
    (productScope !== 'all' ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (minMoq ? 1 : 0);

  const hasSearchOrFilter = Boolean(search || activeFilterCount > 0 || (sortBy !== 'company_az' && !explicitView));

  // Effective view mode:
  // - If user explicitly selected 'grid' or 'list', use that.
  // - If search/filters are active and view isn't 'list', show 'grid'.
  // - Otherwise default to 'showroom'.
  const activeView: 'showroom' | 'grid' | 'list' =
    explicitView === 'list'
      ? 'list'
      : explicitView === 'grid'
        ? 'grid'
        : hasSearchOrFilter
          ? 'grid'
          : 'showroom';

  // Fetch Showroom data (also powers category counts in top ribbon!)
  const { data: browseData = { categories: [], companies: [], sponsored: [] }, isLoading: browseLoading } = useQuery({
    queryKey: ['browse', sortBy],
    queryFn: async () => {
      const res = await fetch(`/api-v2/marketplace/browse?sortBy=${encodeURIComponent(sortBy)}`);
      if (!res.ok) throw new Error(`Browse HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // Fetch paginated catalog products whenever in Grid or Line-Sheet mode
  const { data = {}, isLoading, error } = useQuery({
    queryKey: [
      'products',
      search,
      page,
      selectedLanguages.join(','),
      selectedTypes.join(','),
      selectedCountries.join(','),
      selectedCategoryId,
      selectedSellerId,
      oemOnly,
      productScope,
      maxPrice,
      minMoq,
      sortBy,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: String(PAGE_SIZE),
        sortBy,
        productType: productScope,
      });
      if (search) params.set('q', search);
      if (selectedLanguages.length) params.set('languages', selectedLanguages.join(','));
      if (selectedTypes.length) params.set('sealedTypes', selectedTypes.join(','));
      if (selectedCountries.length) params.set('countries', selectedCountries.join(','));
      if (selectedCategoryId) params.set('category', String(selectedCategoryId));
      if (selectedSellerId) params.set('seller', String(selectedSellerId));
      if (oemOnly) params.set('oem', '1');
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minMoq) params.set('minMoq', minMoq);

      const res = await fetch(`/api-v2/products?${params.toString()}`);
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      if (!res.ok) {
        const errMsg = parsed?.error || (res.status === 429 ? 'Rate limit reached — wait a few seconds and try again.' : text.substring(0, 150));
        throw new Error(`HTTP ${res.status}: ${errMsg}`);
      }
      if (!parsed) {
        throw new Error(`Server returned non-JSON response (${res.status}): ${text.substring(0, 150)}`);
      }
      return parsed;
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: activeView !== 'showroom',
  });

  const rawProducts = Array.isArray(data) ? data : data?.products || [];
  const flatProducts = React.useMemo(
    () =>
      rawProducts
        .filter(Boolean)
        .map((item: any) => {
          const p = item.product || item;
          const seller = item.seller || p.seller || {};
          return { ...p, seller };
        }),
    [rawProducts]
  );

  const totalPages = data?.totalPages || 1;
  const totalCount = typeof data?.totalCount === 'number' ? data.totalCount : facets?.totalProducts || flatProducts.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() || null });
  };

  // Group sealed types by their group label (Boxes / Packs / Decks / ...)
  const typeGroups = React.useMemo(() => {
    const out: Record<string, any[]> = {};
    (facets.sealedTypes || []).forEach((s: any) => {
      (out[s.group] ||= []).push(s);
    });
    return out;
  }, [facets.sealedTypes]);

  const categoryCountMap = React.useMemo(() => {
    const m = new Map<number, number>();
    (browseData.categories || []).forEach((c: any) => {
      m.set(c.id, c.productCount || 0);
      (c.subcategories || []).forEach((s: any) => m.set(s.id, s.productCount || 0));
    });
    return m;
  }, [browseData.categories]);

  const categoryName = (id: number | null) =>
    (Array.isArray(categoriesData) ? categoriesData : []).find((c: any) => c.id === id)?.name;

  const sellerNameById = (id: number | null) => {
    if (!id) return null;
    const fromFacets = (facets.sellers || []).find((s: any) => Number(s.id) === Number(id));
    if (fromFacets) return fromFacets.companyName;
    const fromBrowse = (browseData.companies || []).find((c: any) => Number(c.sellerId) === Number(id));
    return fromBrowse?.companyName || `Supplier #${id}`;
  };

  const sponsoredStrip = (items: any[]) =>
    (items || []).length > 0 ? (
      <section className="bg-gradient-to-r from-[#ffcc00]/[0.07] via-slate-900/80 to-slate-900/60 border border-[#ffcc00]/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[#ffcc00] flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            {t('Sponsored & Featured Allocations')}
          </h2>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {t('Priority Dispatch')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 w-full">
          {(items || []).map((p: any) => (
            <ProductCard
              key={`sponsored-${p?.id}`}
              p={p}
              formatPrice={formatPrice}
              t={t}
              isSponsored={true}
              onSelect={setSelectedProduct}
              onQuickAddSample={handleQuickAddSample}
            />
          ))}
        </div>
      </section>
    ) : null;

  const renderBrowseCard = (p: any, i: number) => (
    <ProductCard
      key={p?.id ?? i}
      p={p}
      formatPrice={formatPrice}
      t={t}
      isSponsored={!!p?.isSponsored}
      onSelect={setSelectedProduct}
      onQuickAddSample={handleQuickAddSample}
    />
  );

  /* ---------- Sidebar Content ---------- */
  const sidebarContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>{t('Sourcing Filters')}</span>
        </div>
        {(activeFilterCount > 0 || search) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            {t('Reset all')}
          </button>
        )}
      </div>

      {/* Sourcing & OEM Capabilities */}
      <FilterSection
        title={t('Sourcing & OEM')}
        count={(oemOnly ? 1 : 0) + (minMoq === '20' ? 1 : 0)}
        defaultOpen={true}
      >
        <FacetCheckbox
          prefix={<Factory className="w-3.5 h-3.5 text-cyan-400" />}
          label={t('OEM / Custom Branding')}
          count={facets.oemCount || undefined}
          checked={oemOnly}
          onChange={() => updateParams({ oem: oemOnly ? null : '1' })}
        />
        <FacetCheckbox
          label={t('Low MOQ (≤ 20 units)')}
          checked={minMoq === '20'}
          onChange={() => updateParams({ minMoq: minMoq === '20' ? null : '20' })}
        />
      </FilterSection>

      {/* Verified Suppliers */}
      {(facets.sellers || []).length > 0 && (
        <FilterSection title={t('Verified Supplier')} count={selectedSellerId ? 1 : 0} defaultOpen={true}>
          {(facets.sellers || []).map((s: any) => (
            <FacetCheckbox
              key={s.id}
              prefix={<span>{flagFor(s.country)}</span>}
              label={s.companyName}
              count={s.count}
              checked={Number(selectedSellerId) === Number(s.id)}
              onChange={() =>
                updateParams({ seller: Number(selectedSellerId) === Number(s.id) ? null : String(s.id) })
              }
            />
          ))}
        </FilterSection>
      )}

      {/* Category Hierarchy */}
      <FilterSection title={t('Category')} count={selectedCategoryId ? 1 : 0} defaultOpen={true}>
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => updateParams({ category: null })}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs sm:text-[13px] transition-all ${
              selectedCategoryId === null
                ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/35 font-bold'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
            }`}
          >
            <span>{t('All Categories')}</span>
            {facets.totalProducts > 0 && (
              <span className="text-[11px] text-slate-400 tabular-nums">{facets.totalProducts}</span>
            )}
          </button>

          {categoryTree.map((parent: any) => {
            const isExpanded = !!expandedCategories[parent.id];
            const count = categoryCountMap.get(parent.id);
            if (!count && parent.children.length === 0 && !parent.isVisibleIfEmpty) return null;
            return (
              <div key={parent.id}>
                <div className="flex items-center w-full gap-0.5">
                  <button
                    type="button"
                    onClick={() => updateParams({ category: String(parent.id) })}
                    className={`flex-1 flex items-center justify-between text-left px-2.5 py-1.5 rounded-xl text-[13px] transition-all ${
                      selectedCategoryId === parent.id
                        ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/35 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="truncate">{parent.name}</span>
                    {typeof count === 'number' && count > 0 && (
                      <span className="text-[11px] text-slate-500 tabular-nums ml-2">{count}</span>
                    )}
                  </button>
                  {parent.children.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => toggleCategory(parent.id, e)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-cyan-400' : ''}`} />
                    </button>
                  )}
                </div>

                {parent.children.length > 0 && isExpanded && (
                  <div className="pl-3 ml-2.5 border-l border-slate-800 space-y-0.5 mt-1">
                    {parent.children.map((child: any) => {
                      const subCount = categoryCountMap.get(child.id);
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => updateParams({ category: String(child.id) })}
                          className={`w-full flex items-center justify-between text-left px-2.5 py-1 rounded-lg text-xs transition-all ${
                            selectedCategoryId === child.id
                              ? 'bg-cyan-500/15 text-cyan-200 font-bold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          <span className="truncate">{child.name}</span>
                          {typeof subCount === 'number' && subCount > 0 && (
                            <span className="text-[10px] text-slate-500 tabular-nums">{subCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FilterSection>

      {/* Language / Edition */}
      {(facets.languages || []).length > 0 && (
        <FilterSection title={t('Card Language / Edition')} count={selectedLanguages.length}>
          {(facets.languages || []).map((l: any) => (
            <FacetCheckbox
              key={l.value}
              prefix={<span>{l.flag}</span>}
              label={t(l.label)}
              count={l.count}
              checked={selectedLanguages.includes(l.value)}
              onChange={() => toggleInList('lang', selectedLanguages, l.value)}
            />
          ))}
        </FilterSection>
      )}

      {/* Product Format */}
      {Object.keys(typeGroups).length > 0 && (
        <FilterSection title={t('Product Format')} count={selectedTypes.length}>
          {Object.entries(typeGroups).map(([group, items]) => (
            <div key={group} className="mb-2.5 last:mb-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-1 pb-1">
                {t(group)}
              </div>
              <div className="space-y-0.5">
                {items.map((s: any) => (
                  <FacetCheckbox
                    key={s.value}
                    label={t(s.label)}
                    count={s.count}
                    checked={selectedTypes.includes(s.value)}
                    onChange={() => toggleInList('type', selectedTypes, s.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </FilterSection>
      )}

      {/* Ships From */}
      {(facets.countries || []).length > 0 && (
        <FilterSection title={t('Ships From')} count={selectedCountries.length} defaultOpen={true}>
          {(facets.countries || []).map((c: any) => (
            <FacetCheckbox
              key={c.value}
              prefix={<span>{flagFor(c.value)}</span>}
              label={c.value}
              count={c.count}
              checked={selectedCountries.includes(c.value)}
              onChange={() => toggleInList('country', selectedCountries, c.value)}
            />
          ))}
        </FilterSection>
      )}

      {/* Price & MOQ */}
      <FilterSection title={t('Target Price & MOQ')} count={(maxPrice ? 1 : 0) + (minMoq ? 1 : 0)} defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('Max PPU')}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={maxPrice}
              onChange={e => updateParams({ maxPrice: e.target.value })}
              placeholder="Any"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t('Max MOQ')}
            </label>
            <input
              type="number"
              min="1"
              value={minMoq}
              onChange={e => updateParams({ minMoq: e.target.value })}
              placeholder="Any"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none transition-colors"
            />
          </div>
        </div>
      </FilterSection>
    </div>
  );

  // Build pagination numbers cleanly
  const pageNumbers = React.useMemo(() => {
    const out: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = Math.max(1, end - 4); i <= end; i++) out.push(i);
    return out;
  }, [page, totalPages]);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col">
      <Helmet>
        <title>Wholesale B2B Marketplace | Hatake.Shop</title>
        <meta
          name="description"
          content="Source verified wholesale sealed TCG products, acrylic display cases, binders, toploaders, and direct factory OEM supplies on Hatake.Shop."
        />
      </Helmet>

      {/* ==================== B2B COMMAND HERO ==================== */}
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-b border-slate-800/80 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[520px] h-[320px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 right-1/4 w-[480px] h-[280px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Title & Live Telemetry */}
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>{t('Verified B2B Wholesale Terminal')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                {t('Wholesale Marketplace')}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 pt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('Escrow Trade Protection')}</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Factory className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('Direct Factory OEM & Sealed TCG Distributors')}</span>
                </span>
                {facets.totalProducts > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {facets.totalProducts} {t('Active SKUs')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Instant Search + Quick Tag Chips */}
            <div className="w-full lg:max-w-xl space-y-2.5">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={t('Search sets, 35PT–360PT, acrylic cases, binders, OEM, or supplier...')}
                  className="w-full bg-slate-950/90 border border-slate-700/90 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 pl-11 pr-28 py-3 rounded-2xl text-sm placeholder-slate-500 outline-none transition-all shadow-inner"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ q: null });
                    }}
                    className="absolute right-24 p-1 text-slate-400 hover:text-white transition-colors"
                    aria-label={t('Clear search')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-950/50"
                >
                  {t('Search')}
                </button>
              </form>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1">
                  {t('Popular')}:
                </span>
                {QUICK_SEARCH_TAGS.map((tag) => {
                  const isActive = tag.q ? search.toLowerCase() === tag.q.toLowerCase() : Boolean(tag.type && selectedTypes.includes(tag.type));
                  return (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => {
                        if (tag.q) {
                          setSearchInput(tag.q);
                          updateParams({ q: isActive ? null : tag.q });
                        } else if (tag.type) {
                          toggleInList('type', selectedTypes, tag.type);
                        }
                      }}
                      className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-all font-medium ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ==================== QUICK CATEGORY RIBBON ==================== */}
          {(browseData.categories || []).length > 0 && (
            <div className="pt-2 border-t border-slate-800/70 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => updateParams({ category: null })}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedCategoryId === null
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('All Catalog')}</span>
              </button>

              {(browseData.categories || []).map((cat: any) => {
                const active = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateParams({ category: active ? null : String(cat.id) })}
                    className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                        active ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cat.productCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col lg:flex-row gap-7 flex-1">
        {/* Desktop Sticky Filter Rail */}
        <aside className="hidden lg:block w-72 shrink-0 bg-slate-900/75 backdrop-blur-md border border-slate-800/90 p-5 rounded-3xl h-fit max-h-[calc(100vh-32px)] overflow-y-auto custom-scrollbar sticky top-4 shadow-xl shadow-black/20">
          {sidebarContent}
        </aside>

        {/* Mobile Slide-Over Filter Drawer */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="relative ml-auto w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl z-10">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <span className="font-extrabold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  {t('Filters')}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{sidebarContent}</div>
              <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  {t('Reset')}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-xs font-bold uppercase tracking-wider"
                >
                  {t('Show Results')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Column */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Toolbar: Mobile Filters + Active Chips + View Mode + Scope + Sort */}
          <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3.5 sm:px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Left: Mobile filter trigger + Active filter chips / Status */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('Filters')}</span>
                {activeFilterCount > 0 && (
                  <span className="bg-cyan-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {search && (
                <Chip
                  label={`"${search}"`}
                  onRemove={() => {
                    setSearchInput('');
                    updateParams({ q: null });
                  }}
                />
              )}
              {oemOnly && <Chip label={t('OEM Available')} onRemove={() => updateParams({ oem: null })} />}
              {selectedSellerId && (
                <Chip
                  label={sellerNameById(selectedSellerId) || t('Supplier')}
                  onRemove={() => updateParams({ seller: null })}
                />
              )}
              {selectedCategoryId && (
                <Chip
                  label={categoryName(selectedCategoryId) || t('Category')}
                  onRemove={() => updateParams({ category: null })}
                />
              )}
              {selectedLanguages.map(v => {
                const l = (facets.languages || []).find((x: any) => x.value === v);
                return (
                  <Chip
                    key={v}
                    label={`${l?.flag || ''} ${t(l?.label || v)}`}
                    onRemove={() => toggleInList('lang', selectedLanguages, v)}
                  />
                );
              })}
              {selectedTypes.map(v => {
                const s = (facets.sealedTypes || []).find((x: any) => x.value === v);
                return (
                  <Chip
                    key={v}
                    label={t(s?.label || v)}
                    onRemove={() => toggleInList('type', selectedTypes, v)}
                  />
                );
              })}
              {selectedCountries.map(v => (
                <Chip
                  key={v}
                  label={`${flagFor(v)} ${v}`}
                  onRemove={() => toggleInList('country', selectedCountries, v)}
                />
              ))}
              {productScope !== 'all' && (
                <Chip
                  label={productScope === 'graded' ? t('Graded Slabs') : t('Sealed & Supplies')}
                  onRemove={() => updateParams({ scope: null })}
                />
              )}
              {maxPrice && (
                <Chip
                  label={`≤ ${formatPrice(Number(maxPrice))}`}
                  onRemove={() => updateParams({ maxPrice: null })}
                />
              )}
              {minMoq && (
                <Chip label={`MOQ ≤ ${minMoq}`} onRemove={() => updateParams({ minMoq: null })} />
              )}

              {(activeFilterCount > 0 || search) ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-slate-400 hover:text-cyan-300 font-semibold underline underline-offset-2 ml-1"
                >
                  {t('Clear all')}
                </button>
              ) : (
                <span className="text-xs sm:text-sm text-slate-400 font-medium">
                  {activeView === 'showroom'
                    ? `${(browseData.categories || []).length} ${t('Categories')} · ${(browseData.companies || []).length} ${t('Verified Suppliers')}`
                    : `${t('Showing')} ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} ${t('of')} ${totalCount} ${t('SKUs')}`}
                </span>
              )}
            </div>

            {/* Right: Scope + View Switcher + Sort */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Product Scope Segmented Control */}
              <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
                {(
                  [
                    { id: 'all', label: t('All') },
                    { id: 'sealed', label: t('Sealed & Supplies') },
                    { id: 'graded', label: t('Graded') },
                  ] as const
                ).map(tab => {
                  const active = productScope === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        updateParams({
                          scope: tab.id === 'all' ? null : tab.id,
                          view: tab.id !== 'all' && activeView === 'showroom' ? 'grid' : explicitView,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                        active ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* 3-Mode View Switcher */}
              <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (hasSearchOrFilter) clearAll();
                    else updateParams({ view: null }, false);
                  }}
                  title={t('Showroom View (Categories & Suppliers)')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'showroom'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('Showroom')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ view: 'grid' }, false)}
                  title={t('Catalog Grid View')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'grid'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('Grid')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ view: 'list' }, false)}
                  title={t('B2B Line-Sheet View')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeView === 'list'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('Line-Sheet')}</span>
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => updateParams({ sort: e.target.value })}
                  aria-label={t('Sort By')}
                  className="appearance-none bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-200 outline-none cursor-pointer transition-colors"
                >
                  <option value="company_az">{t('Sort: Supplier (A–Z)')}</option>
                  <option value="newest">{t('Sort: Newest Arrivals')}</option>
                  <option value="price_asc">{t('Sort: Price Low → High')}</option>
                  <option value="price_desc">{t('Sort: Price High → Low')}</option>
                  <option value="lowest_moq">{t('Sort: Lowest MOQ')}</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ==================== MAIN CONTENT AREA ==================== */}
          {error && activeView !== 'showroom' ? (
            <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-3xl text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base mb-1">{t('Temporary Connection Issue')}</h3>
                <p className="text-xs text-rose-300/90">{error.message}</p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-bold text-white shrink-0"
              >
                {t('Retry')}
              </button>
            </div>
          ) : (activeView === 'showroom' ? browseLoading : isLoading) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div
                  key={i}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 animate-pulse"
                >
                  <div className="w-full aspect-[4/3] bg-slate-800/80 rounded-xl" />
                  <div className="h-3 bg-slate-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-800 rounded w-4/5" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                  <div className="mt-auto pt-3 border-t border-slate-800 flex justify-between">
                    <div className="h-6 bg-slate-800 rounded w-20" />
                    <div className="h-6 bg-slate-800 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeView === 'showroom' ? (
            (browseData.categories || []).length === 0 && (browseData.companies || []).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col items-center justify-center py-24 px-4 text-center">
                <PackageSearch className="w-14 h-14 text-slate-600 mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">{t('No wholesale listings available yet')}</h3>
                <p className="text-sm text-slate-400 max-w-md">{t('Check back shortly as verified suppliers publish inventory.')}</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Verified Supplier Quick-Access Cards */}
                {(browseData.companies || []).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(browseData.companies || []).map((co: any) => (
                      <div
                        key={`spotlight-${co.sellerId}`}
                        className="group bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all shadow-lg"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-xl shrink-0">
                            {flagFor(co.country)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/company/${co.sellerId}`}
                                className="font-extrabold text-white hover:text-cyan-300 transition-colors truncate text-base"
                              >
                                {co.companyName}
                              </Link>
                              <VerificationBadge status={co.verificationStatus} />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {co.country ? `${co.country} · ` : ''}
                              <span className="text-cyan-300 font-semibold tabular-nums">
                                {co.productCount} {t('wholesale SKUs')}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateParams({ seller: String(co.sellerId), view: 'grid' })}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                          >
                            {t('Filter SKUs')}
                          </button>
                          <Link
                            to={`/company/${co.sellerId}/listings`}
                            className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 transition-colors"
                            title={t('Open Supplier Showroom')}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sponsoredStrip(browseData.sponsored || [])}

                <BrowseSections
                  categories={browseData.categories || []}
                  companies={browseData.companies || []}
                  renderCard={renderBrowseCard}
                  onViewCategory={(id: number) => {
                    updateParams({ category: String(id), view: 'grid' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onSelectSupplier={(sid: number) => {
                    updateParams({ seller: String(sid), view: 'grid' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )
          ) : flatProducts.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col items-center justify-center py-24 px-4 text-center">
              <PackageSearch className="w-14 h-14 text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">{t('No matching wholesale products')}</h3>
              <p className="text-sm text-slate-400 max-w-md mb-5">
                {t('Try broadening your filters or clearing your search query.')}
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                {t('Reset All Filters')}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Result Section Header */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    {selectedCategoryId
                      ? categoryName(selectedCategoryId)
                      : selectedSellerId
                        ? sellerNameById(selectedSellerId)
                        : search
                          ? `${t('Search Results for')} "${search}"`
                          : t('All Wholesale Listings')}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                    {totalCount} {totalCount === 1 ? t('matching SKU') : t('matching SKUs')}
                    {totalPages > 1 ? ` · ${t('Page')} ${page} ${t('of')} ${totalPages}` : ''}
                  </p>
                </div>
                {(hasSearchOrFilter || explicitView) && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {t('Back to Showroom')}
                  </button>
                )}
              </div>

              {activeView === 'list' ? (
                <div className="space-y-3">
                  {flatProducts.map((p: any) => (
                    <ProductLineRow
                      key={p?.id}
                      p={p}
                      formatPrice={formatPrice}
                      t={t}
                      onSelect={setSelectedProduct}
                      onQuickAddSample={handleQuickAddSample}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 w-full">
                  {flatProducts.map((p: any) => (
                    <ProductCard
                      key={p?.id}
                      p={p}
                      formatPrice={formatPrice}
                      t={t}
                      isSponsored={!!p?.isSponsored}
                      onSelect={setSelectedProduct}
                      onQuickAddSample={handleQuickAddSample}
                    />
                  ))}
                </div>
              )}

              {/* Numbered Pagination Footer */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-6">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      updateParams({ page: String(page - 1) }, false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 disabled:opacity-40 hover:border-cyan-500/40 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {t('Prev')}
                  </button>

                  {pageNumbers.map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        updateParams({ page: String(num) }, false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 rounded-xl text-xs font-bold tabular-nums transition-all border ${
                        num === page
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => {
                      updateParams({ page: String(page + 1) }, false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 disabled:opacity-40 hover:border-cyan-500/40 transition-colors"
                  >
                    {t('Next')}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          products={activeView === 'showroom' ? undefined : flatProducts}
          onSelectProduct={setSelectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
