import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FeedbackModal } from './FeedbackModal';
import { useCart } from './SampleCart.tsx';
import {
  Package,
  Search,
  MessageSquare,
  Settings,
  LogIn,
  LogOut,
  Shield,
  Store,
  Menu,
  X,
  ShoppingCart,
  Building2,
  Newspaper,
  Globe,
  Heart,
  Home,
  Bot,
  ShoppingBag,
  Truck,
  ArrowUpRight,
  Box,
  ShieldCheck,
  Sun,
  Moon,
  Database,
  Users,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  PlusCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Notifications } from './Notifications.tsx';
import { useTranslation } from 'react-i18next';
import { CurrencySelector } from './CurrencySelector.tsx';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.tsx';
import { useSiteMode } from './SiteModeContext.tsx';
import { LanguageToggle } from './LanguageToggle.tsx';
import { useCurrency } from './CurrencyProvider.tsx';
import { SafeImage } from './SafeImage.tsx';
import { getB2cPriceSEK } from '../pages/SwedenShop.tsx';
import { useTheme } from './ThemeContext.tsx';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { isLight, toggleTheme } = useTheme();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? t('Mörkt läge') : t('Ljust läge')}
      aria-label={isLight ? t('Mörkt läge') : t('Ljust läge')}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all cursor-pointer shrink-0',
        className
      )}
    >
      {isLight ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden xl:inline">{t('Light')}</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline">{t('Dark')}</span>
        </>
      )}
    </button>
  );
}

/**
 * Bottom Admin Panel for the B2B site — rendered ONLY when the current user is an authenticated admin.
 */
function B2bBottomAdminPanel() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [b2cCount, setB2cCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token =
          sessionStorage.getItem('hatake_admin_token') ||
          localStorage.getItem('hatake_admin_token') ||
          (await user?.getIdToken()) ||
          '';
        const [statsRes, b2cRes] = await Promise.all([
          fetch('/api-v2/admin/stats', {
            headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
          }).catch(() => null),
          fetch('/api-v2/sverige-products').catch(() => null),
        ]);
        if (!active) return;
        if (statsRes && statsRes.ok) {
          setAdminStats(await statsRes.json());
        }
        if (b2cRes && b2cRes.ok) {
          const arr = await b2cRes.json();
          if (Array.isArray(arr)) setB2cCount(arr.length);
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <section
      aria-label="B2B Admin Quick Panel"
      className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 mb-8"
    >
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-500/15 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-tight">
                  {t('B2B Admin Control Panel')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold uppercase tracking-wider">
                  {t('Admin Only')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('Quick administration dock for B2B.Hatake.Shop & Hatake.Shop (B2C)')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-md"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('Open Full Admin Dashboard')}</span>
            </Link>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              aria-label={expanded ? 'Collapse admin panel' : 'Expand admin panel'}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-5 space-y-4">
            {/* Live Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t('B2B Listings')}
                </div>
                <div className="text-xl font-black text-white mt-0.5 tabular-nums">
                  {adminStats?.productCount ?? '—'}
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  🇸🇪 hatake.shop (B2C)
                </div>
                <div className="text-xl font-black text-white mt-0.5 tabular-nums">
                  {b2cCount} {t('live')}
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  {t('Registered Users')}
                </div>
                <div className="text-xl font-black text-white mt-0.5 tabular-nums">
                  {adminStats?.userCount ?? '—'}
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {t('Active RFQs')}
                </div>
                <div className="text-xl font-black text-white mt-0.5 tabular-nums">
                  {adminStats?.inquiryCount ?? '—'}
                </div>
              </div>
            </div>

            {/* Quick Action Links */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>🇸🇪 {t('Add / Manage hatake.shop Products')}</span>
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-colors"
              >
                <Package className="w-3.5 h-3.5" />
                <span>🌍 {t('Manage All B2B Listings')}</span>
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('Supplier & Product Approvals')}</span>
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('Users & Leads CRM')}</span>
              </Link>
              <Link
                to="/admin/db"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('Database Viewer')}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function Layout() {
  const { user, logOut, dbUser, isAdminPasswordSession } = useAuth();
  const { t } = useTranslation();
  const { items: b2bCartItems, sverigeItems: b2cCartItems, setCartOpen } = useCart();
  const { isB2C, isB2B, switchSiteMode, b2bHref, b2cHref } = useSiteMode();
  const { formatSEK } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // STRICT ADMIN PASSWORD LOCK:
  // Admin navigation and docks are ONLY visible when unlocked via ADMIN_PASSWORD (.env)
  const isAdminAccount = Boolean(isAdminPasswordSession);

  // Live header search for B2C storefront
  const [headerSearch, setHeaderSearch] = useState(searchParams.get('q') || '');
  const [b2cPreviewPool, setB2cPreviewPool] = useState<any[]>([]);
  const [showPreviewDropdown, setShowPreviewDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeaderSearch(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    if (!isB2C) return;
    fetch('/api-v2/sverige-products')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setB2cPreviewPool(data);
      })
      .catch(() => {});
  }, [isB2C]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowPreviewDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const liveSearchMatches = React.useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return b2cPreviewPool
      .filter((p) => {
        const hay = `${p.sverigeTitle || ''} ${p.title || ''} ${p.brand || ''} ${p.description || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 6);
  }, [headerSearch, b2cPreviewPool]);

  const handleB2cHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPreviewDropdown(false);
    const trimmed = headerSearch.trim();
    if (trimmed) {
      navigate(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/');
    }
  };

  const b2cTotalUnits = b2cCartItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const b2bTotalUnits = b2bCartItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const activeCartBadgeCount = isB2C ? b2cTotalUnits : b2bTotalUnits;

  const b2bMainNavItems: { name: string; label: string; path: string; icon: any; protected?: boolean }[] = [
    { name: 'Home', label: 'Home', path: '/b2b', icon: Home },
    { name: 'Marketplace', label: 'Marketplace', path: '/marketplace', icon: Store },
    { name: 'Suppliers', label: 'Suppliers', path: '/suppliers', icon: Building2 },
    { name: 'Launch Ledger', label: 'Launch Ledger', path: '/leads', icon: Globe },
    { name: 'Feed', label: 'Feed', path: '/feed', icon: Newspaper },
    { name: 'AI Sourcing Agent', label: 'AI Agent', path: '/onboarding', icon: Bot },
    { name: 'Wishlist', label: 'Wishlist', path: '/wishlist', icon: Heart, protected: true },
    { name: 'RFQ Messages', label: 'RFQ Messages', path: '/rfq', icon: MessageSquare, protected: true },
  ];

  const b2cCategoryLinks = [
    { label: t('Alla'), cat: 'all' },
    { label: t('Booster-boxar'), cat: 'booster_boxes' },
    { label: t('ETB & Samlarboxar'), cat: 'etb_collections' },
    { label: t('Decks'), cat: 'decks' },
    { label: t('Graderade Kort'), cat: 'graded' },
    { label: t('Pärmar & Tillbehör'), cat: 'accessories' },
  ];

  const managementNavItems = [
    ...(dbUser?.role === 'seller' || dbUser?.role === 'both'
      ? [{ name: 'Supplier Portal', label: 'Supplier Portal', path: '/seller', icon: Store, protected: true }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 font-sans w-full max-w-full overflow-x-clip">
      {/* Top Announcement & Cross-Site Bar */}
      <div className="bg-slate-900 border-b border-slate-800/90 text-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
          {isB2C ? (
            <div className="flex items-center gap-3 sm:gap-5 text-slate-300 font-medium overflow-x-auto no-scrollbar">
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('Snabb leverans från svenskt lager (1–3 dagar)')}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('Fri frakt över 999 kr · Säker betalning med Stripe')}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-5 text-slate-300 font-medium overflow-x-auto no-scrollbar">
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('B2B.Hatake.Shop — International TCG Wholesale & Factory OEM')}</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 shrink-0 text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('Verified Suppliers · Volume Tiered Pricing · Escrow Protection')}</span>
              </span>
            </div>
          )}

          {/* Cross-Site Switcher Link */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {isB2C ? (
              <a
                href={b2bHref}
                onClick={(e) => {
                  e.preventDefault();
                  switchSiteMode('b2b');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 font-bold text-[11px] transition-colors"
              >
                <Building2 className="w-3 h-3 text-indigo-400" />
                <span>{t('Grossist / B2B Wholesale')} → b2b.hatake.shop</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            ) : (
              <a
                href={b2cHref}
                onClick={(e) => {
                  e.preventDefault();
                  switchSiteMode('b2c');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 font-bold text-[11px] transition-colors"
              >
                <span>🇸🇪 {t('Svenska B2C-butiken')} → hatake.shop</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-[60] bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/90 shadow-sm w-full max-w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {isB2C ? (
            /* ==================== B2C FLAGSHIP HEADER (hatake.shop — 2 Rows) ==================== */
            <div className="py-2.5 sm:py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Brand Logo */}
                <Link
                  to="/"
                  className="flex items-center gap-2 text-white font-black text-lg sm:text-xl tracking-tight shrink-0"
                >
                  <img src="/logo.png" alt="Hatake.Shop" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
                  <div className="flex flex-col leading-none">
                    <span>
                      Hatake<span className="text-cyan-400">.Shop</span>
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      🇸🇪 Sverige · TCG &amp; Hobby
                    </span>
                  </div>
                </Link>

                {/* Desktop Live Search Bar with Product Previews */}
                <div ref={searchBoxRef} className="hidden md:block relative flex-1 max-w-xl">
                  <form onSubmit={handleB2cHeaderSearchSubmit} className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={headerSearch}
                      onFocus={() => setShowPreviewDropdown(true)}
                      onChange={(e) => {
                        setHeaderSearch(e.target.value);
                        setShowPreviewDropdown(true);
                      }}
                      placeholder={t('Sök bland produkter, booster-boxar, pärmar, toploaders, PSA 10...')}
                      aria-label={t('Search products...')}
                      className="w-full bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded-xl pl-10 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition-colors"
                    />
                    {headerSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderSearch('');
                          navigate('/');
                        }}
                        aria-label={t('Clear')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </form>

                  {/* Live Product Previews Dropdown */}
                  {showPreviewDropdown && liveSearchMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800">
                      {liveSearchMatches.map((p) => {
                        let imgs: string[] = [];
                        try {
                          imgs =
                            Array.isArray(p.sverigeImages) && p.sverigeImages.length
                              ? p.sverigeImages
                              : Array.isArray(p.images)
                                ? p.images
                                : JSON.parse(p.images || '[]');
                        } catch {}
                        const title = p.sverigeTitle || p.title;
                        const price = getB2cPriceSEK(p);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setShowPreviewDropdown(false);
                              navigate(`/product/${p.id}`);
                            }}
                            className="w-full p-2.5 hover:bg-slate-800/90 flex items-center gap-3 text-left transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                              <SafeImage
                                src={imgs[0]}
                                alt={title}
                                fallbackIcon={<Package className="w-4 h-4 text-slate-600" />}
                                className="w-full h-full object-contain p-0.5"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white truncate">{title}</div>
                              <div className="text-[10px] text-slate-400">{p.brand || 'Hatake'}</div>
                            </div>
                            <div className="text-xs font-extrabold text-cyan-400 tabular-nums shrink-0">
                              {formatSEK(price)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Controls: Theme Toggle, SV|EN Toggle, Account, Cart Trigger */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <ThemeToggleButton />
                  <LanguageToggle />

                  {user ? (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <Link
                        to="/orders"
                        title={t('Order History')}
                        aria-label={t('Order History')}
                        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Package className="w-4 h-4" />
                      </Link>
                      <Link
                        to="/settings"
                        title={t('Settings')}
                        aria-label={t('Settings')}
                        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('Logga in')}</span>
                    </Link>
                  )}

                  {/* Cart Drawer Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    aria-label={t('Open cart')}
                    className="relative inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-extrabold text-xs transition-all shadow-md shadow-cyan-500/15 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{t('Varukorg')}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-white text-[11px] font-black tabular-nums">
                      {activeCartBadgeCount}
                    </span>
                  </button>

                  {/* Mobile Hamburger Menu Button */}
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label={t('Menu')}
                    className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Row 2: Desktop Quick Category Strip */}
              <nav className="hidden md:flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/70 text-xs">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {b2cCategoryLinks.map((c) => {
                    const currentCat = searchParams.get('cat') || 'all';
                    const isActive = location.pathname === '/' && currentCat === c.cat;
                    return (
                      <Link
                        key={c.cat}
                        to={c.cat === 'all' ? '/' : `/?cat=${c.cat}`}
                        className={cn(
                          'px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap',
                          isActive
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        )}
                      >
                        {c.label}
                      </Link>
                    );
                  })}
                </div>

                <a
                  href={b2bHref}
                  onClick={(e) => {
                    e.preventDefault();
                    switchSiteMode('b2b');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 shrink-0"
                >
                  <span>{t('B2B Grossistportal')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </nav>
            </div>
          ) : (
            /* ==================== B2B WHOLESALE HEADER (b2b.hatake.shop — Clean Two-Row Layout) ==================== */
            <div className="py-2.5 sm:py-3 space-y-2.5">
              {/* ROW 1: Brand & Workspace on Left | Theme, Currency, Language, Become a Supplier, Cart, User on Right */}
              <div className="flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                  <Link
                    to="/b2b"
                    className="flex items-center gap-2 text-white font-black text-base sm:text-xl tracking-tight shrink-0"
                  >
                    <img src="/logo.png" alt="B2B.Hatake.Shop" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
                    <div className="flex flex-col leading-none">
                      <span>
                        B2B.Hatake<span className="text-cyan-400">.Shop</span>
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">
                        {t('International Wholesale')}
                      </span>
                    </div>
                  </Link>
                  <WorkspaceSwitcher />
                </div>

                {/* Desktop Right Utility Controls (Row 1 — never overlaps with nav links!) */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <ThemeToggleButton />
                  <CurrencySelector />
                  <LanguageToggle />

                  {dbUser?.role === 'buyer' && (
                    <Link
                      to="/apply-seller"
                      className="px-3 py-1.5 bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>{t('Become a Supplier')}</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    aria-label={t('Open cart')}
                    title={t('B2B Wholesale Cart')}
                    className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4 text-cyan-400" />
                    <span className="hidden lg:inline">{t('Cart')}</span>
                    {activeCartBadgeCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full tabular-nums">
                        {activeCartBadgeCount}
                      </span>
                    )}
                  </button>

                  {user ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {managementNavItems.map((item) => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              'px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0',
                              active
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                            )}
                          >
                            <item.icon className="w-3.5 h-3.5" />
                            <span>{t(item.label)}</span>
                          </Link>
                        );
                      })}

                      <Notifications />

                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-full p-1">
                        <Link
                          to="/settings"
                          className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-slate-800 transition-all"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span className="max-w-[110px] truncate">
                            {(dbUser?.displayName && dbUser.displayName !== 'User'
                              ? dbUser.displayName
                              : null) ||
                              user?.displayName ||
                              (user?.email ? user.email.split('@')[0] : null) ||
                              t('Settings')}
                          </span>
                          {dbUser?.verificationStatus === 'verified' && (
                            <span title={t('Verified Business')} className="flex items-center">
                              <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/orders"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                          title={t('Order History')}
                          aria-label={t('Order History')}
                        >
                          <Package className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={logOut}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                          title={t('Sign Out')}
                          aria-label={t('Sign Out')}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0"
                    >
                      <LogIn className="w-3.5 h-3.5 mr-1.5" />
                      <span>{t('Business Sign In')}</span>
                    </Link>
                  )}
                </div>

                {/* Mobile B2B Header Controls */}
                <div className="md:hidden flex items-center gap-1.5 shrink-0">
                  <ThemeToggleButton />
                  <LanguageToggle />
                  {user && <Notifications />}
                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    aria-label={t('Open cart')}
                    className="relative p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
                  >
                    <ShoppingBag className="w-5 h-5 text-cyan-400" />
                    {activeCartBadgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {activeCartBadgeCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label={t('Menu')}
                    className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* ROW 2: Dedicated B2B Navigation Bar (Full Width, Scrollable on Tablet, Zero Overlap!) */}
              <nav
                aria-label="B2B Primary Navigation"
                className="hidden md:flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar"
              >
                <div className="flex items-center gap-1.5">
                  {b2bMainNavItems.map((item) => {
                    if (item.protected && !user) return null;
                    const active =
                      item.path === '/b2b'
                        ? location.pathname === '/' || location.pathname === '/b2b'
                        : location.pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={t(item.name)}
                        aria-label={t(item.name)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap',
                          active
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/35 shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{t(item.label)}</span>
                      </Link>
                    );
                  })}

                  {isAdminAccount && (
                    <Link
                      to="/admin"
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap',
                        location.pathname.startsWith('/admin')
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                      )}
                    >
                      <Shield className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('Admin Panel')}</span>
                    </Link>
                  )}
                </div>

                <a
                  href={b2cHref}
                  onClick={(e) => {
                    e.preventDefault();
                    switchSiteMode('b2c');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-1 shrink-0 whitespace-nowrap pl-2"
                >
                  <span>🇸🇪 {t('Hatake.Shop (B2C)')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </nav>
            </div>
          )}
        </div>

        {/* Mobile Slide-Down Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-3 my-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-2 shadow-2xl">
            {isB2C ? (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">
                  {t('Kategorier (Svenskt Lager)')}
                </div>
                {b2cCategoryLinks.map((c) => (
                  <Link
                    key={c.cat}
                    to={c.cat === 'all' ? '/' : `/?cat=${c.cat}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>{c.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                ))}
                <div className="h-px bg-slate-800 my-1" />
                <a
                  href={b2bHref}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    switchSiteMode('b2b');
                  }}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-between"
                >
                  <span>🌐 {t('Grossist / B2B Wholesale (b2b.hatake.shop)')}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-400">{t('Valuta / Currency')}</span>
                  <CurrencySelector />
                </div>
                {[...b2bMainNavItems, ...managementNavItems].map((item) => {
                  if (item.protected && !user) return null;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all',
                        active ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'
                      )}
                    >
                      <item.icon className={cn('w-4 h-4', active ? 'text-cyan-400' : 'text-slate-400')} />
                      <span>{t(item.label)}</span>
                    </Link>
                  );
                })}
                <div className="h-px bg-slate-800 my-1" />
                <a
                  href={b2cHref}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    switchSiteMode('b2c');
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-between"
                >
                  <span>🇸🇪 {t('Till Svenska B2C-butiken (hatake.shop)')}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </>
            )}

            <div className="h-px bg-slate-800 my-1" />
            {user ? (
              <>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 text-slate-300 hover:bg-slate-800"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>{t('Order History')}</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 text-slate-300 hover:bg-slate-800"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>{t('Settings')}</span>
                </Link>
                {isAdminAccount && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 text-amber-400 hover:bg-slate-800"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>{t('Admin Panel')}</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logOut();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 text-rose-400 hover:bg-slate-800 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('Sign Out')}</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-cyan-500 text-white"
              >
                <LogIn className="w-4 h-4" />
                <span>{isB2C ? t('Logga in / Skapa konto') : t('Business Sign In')}</span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-24 md:pb-10">
        <Outlet />
      </main>

      {/* Dedicated Bottom Admin Control Panel on B2B (ONLY visible to Admin Accounts) */}
      {isB2B && isAdminAccount && <B2bBottomAdminPanel />}

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800/90 py-8 sm:py-10 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <ThemeToggleButton />
            {!isB2C && <CurrencySelector />}
            <LanguageToggle />
          </div>

          <div className="text-center flex flex-col items-center space-y-2">
            <p className="font-bold text-slate-200 leading-snug">
              &copy; {new Date().getFullYear()} {isB2C ? 'Hatake.Shop Sverige' : 'B2B.Hatake.Shop'} &middot;
              <br />
              {t('All rights reserved.')}
            </p>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest leading-relaxed">
              {isB2C ? (
                <>
                  {t('SVENSK TCG- & HOBBYBUTIK')} &middot;
                  <br />
                  {t('SNABB LEVERANS FRÅN SVERIGE')}
                </>
              ) : (
                <>
                  {t('INTERNATIONAL WHOLESALE B2B')} &middot;
                  <br />
                  {t('AI SOURCING PLATFORM')}
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {isB2C ? (
                <a
                  href={b2bHref}
                  onClick={(e) => {
                    e.preventDefault();
                    switchSiteMode('b2b');
                  }}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <span>🌐 {t('Grossist / B2B Wholesale')} → b2b.hatake.shop</span>
                </a>
              ) : (
                <>
                  <Link
                    to="/leads"
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    📋 {t('Launch Ledger')}
                  </Link>
                  <a
                    href={b2cHref}
                    onClick={(e) => {
                      e.preventDefault();
                      switchSiteMode('b2c');
                    }}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-lg transition-colors"
                  >
                    🇸🇪 {t('Svenska B2C-butiken (hatake.shop)')}
                  </a>
                </>
              )}
              {isAdminAccount && (
                <Link
                  to="/admin"
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider"
                >
                  {t('Admin Panel')} (/admin)
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="text-slate-400 hover:text-cyan-400 font-semibold transition-colors cursor-pointer"
            >
              {t('Report Bug / Feedback')}
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar for 1-Tap Thumb Navigation */}
      {isB2C ? (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          <Link
            to="/"
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors',
              location.pathname === '/' && !searchParams.get('cat')
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('Butik')}</span>
          </Link>

          <Link
            to="/?cat=booster_boxes"
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors',
              searchParams.get('cat') === 'booster_boxes'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Box className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('Boxar')}</span>
          </Link>

          <Link
            to="/?cat=accessories"
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors',
              searchParams.get('cat') === 'accessories'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('Tillbehör')}</span>
          </Link>

          <button
            type="button"
            onClick={() => switchSiteMode('b2b')}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">B2B</span>
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-300 hover:text-white relative transition-colors"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-cyan-400" />
              {activeCartBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeCartBadgeCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('Varukorg')}</span>
          </button>
        </nav>
      ) : (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          <Link
            to="/b2b"
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors',
              location.pathname === '/' || location.pathname === '/b2b'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('Home')}</span>
          </Link>

          <Link
            to="/marketplace"
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors',
              location.pathname.startsWith('/marketplace')
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('Marketplace')}</span>
          </Link>

          <Link
            to="/suppliers"
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors',
              location.pathname.startsWith('/suppliers')
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{t('Suppliers')}</span>
          </Link>

          <Link
            to={user ? '/rfq' : '/login'}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors',
              location.pathname.startsWith('/rfq')
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">RFQ</span>
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-300 hover:text-white relative transition-colors"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-cyan-400" />
              {activeCartBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeCartBadgeCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{t('Cart')}</span>
          </button>
        </nav>
      )}

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
