import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Globe2,
  ExternalLink,
  Mail,
  Package,
  Star,
  ArrowRight,
  User,
  UserPlus,
  UserMinus,
  Maximize2,
  Search,
  Check,
  ChevronDown,
  LayoutGrid,
  Rows3,
  X,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../components/AuthContext.tsx';
import { SpotlightGallery, GalleryAssetItem } from '../components/SpotlightGallery.tsx';
import { VendorReviews } from '../components/VendorReviews.tsx';
import { ProductModal } from '../components/ProductModal.tsx';
import { useCurrency } from '../components/CurrencyProvider.tsx';
import { useCart } from '../components/SampleCart.tsx';
import { VerificationBadge } from '../components/VerificationBadge.tsx';
import { SafeImage, optimizeImageUrl } from '../components/SafeImage.tsx';

function inferProductCategoryLabel(p: any): string {
  if (p?.categoryName && String(p.categoryName).trim()) {
    return String(p.categoryName).trim();
  }
  const title = String(p?.title || '').toLowerCase();
  if (title.includes('toploader') && title.includes('binder')) return 'Top-Loader Binders';
  if (title.includes('binder') || title.includes('pärm') || title.includes('album')) return 'Binders';
  if (title.includes('acrylic') || title.includes('akryl')) return 'Acrylic Cases';
  if (title.includes('toploader') || title.includes('top loader') || title.includes('magnetic')) return 'Toploaders & Holders';
  if (title.includes('deck') && (title.includes('box') || title.includes('case'))) return 'Deck Boxes';
  if (title.includes('sleeve')) return 'Sleeves';
  if (title.includes('playmat') || title.includes('mat')) return 'Playmats';
  if (title.includes('booster box')) return 'Booster Boxes';
  if (title.includes('etb') || title.includes('elite trainer') || title.includes('gift box')) return 'ETB & Gift Boxes';
  if (p?.productType === 'graded') return 'Graded Cards';
  return 'General Catalog';
}

function getMemberRoleLabel(member: any): string {
  const sysRole = String(member?.role || '').toLowerCase();
  const teamRole = String(member?.teamRole || '').toLowerCase();
  if (sysRole === 'admin' || teamRole === 'owner' || teamRole === 'admin') {
    return 'Admin';
  }
  if (teamRole === 'sales_rep') return 'Sales Rep';
  if (teamRole === 'catalog_manager') return 'Catalog Manager';
  return 'Team Member';
}

export function CompanyProfile() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const { id } = useParams<{ id: string }>();
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isContacting, setIsContacting] = useState(false);
  const queryClient = useQueryClient();

  // Multi-category filtering & progressive downward load states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'grouped'>('grid');
  const [visibleCount, setVisibleCount] = useState(12);

  const handleContact = async () => {
    if (!user) {
      toast.error(t('Please log in to contact the supplier'));
      navigate('/login');
      return;
    }
    setIsContacting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api-v2/seller/${id}/contact`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const newInq = await res.json();
      if (res.ok) {
        toast.success(t('Message thread created!'));
        navigate(`/rfq/${newInq.id}`);
      } else toast.error(newInq.error || 'Failed to start conversation');
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsContacting(false);
    }
  };

  const { data: followData } = useQuery({
    queryKey: ['companyFollow', id],
    queryFn: async () => {
      if (!user) return { following: false };
      const res = await fetch(`/api-v2/company/${id}/follow`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      if (!res.ok) return { following: false };
      return res.json();
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api-v2/company/${id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyFollow', id] });
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['companyProfile', id],
    queryFn: async () => {
      const res = await fetch(`/api-v2/company/${id}`);
      if (!res.ok) throw new Error('Failed to fetch company profile');
      return res.json();
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['vendorReviews', id],
    queryFn: async () => {
      const res = await fetch(`/api-v2/users/${id}/reviews`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const company = data?.company;
  const teamMembers = data?.teamMembers || [];
  const products: any[] = Array.isArray(data?.products) ? data.products : [];

  const galleryAssets: GalleryAssetItem[] = useMemo(() => {
    const items: GalleryAssetItem[] = [];
    for (const p of products) {
      let pImgs: string[] = [];
      try {
        pImgs = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]');
      } catch {}
      const cat = inferProductCategoryLabel(p);
      for (const u of pImgs) {
        if (u && typeof u === 'string') {
          items.push({ url: u, title: p.title, category: cat });
        }
      }
    }
    for (const r of Array.isArray(reviews) ? reviews : []) {
      const rImgs = Array.isArray(r?.images) ? r.images : [];
      for (const u of rImgs) {
        if (u && typeof u === 'string') {
          items.push({
            url: u,
            title: `${company?.companyName || 'Supplier'} — Verified Review Photo`,
            category: 'Customer Reviews & Factory',
          });
        }
      }
    }
    if (company?.profilePictureUrl) {
      items.push({
        url: company.profilePictureUrl,
        title: `${company.companyName} Logo`,
        category: 'Company',
      });
    }
    if (company?.bannerUrl) {
      items.push({
        url: company.bannerUrl,
        title: `${company.companyName} Banner`,
        category: 'Company',
      });
    }
    return items;
  }, [products, reviews, company]);

  const allImages = useMemo(() => galleryAssets.map((a) => a.url), [galleryAssets]);

  // Extract all product categories available for this company
  const companyCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const cat = inferProductCategoryLabel(p);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const toggleCategorySelection = (catName: string) => {
    setVisibleCount(12);
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((x) => x !== catName) : [...prev, catName]
    );
  };

  const filteredProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return products.filter((p) => {
      const cat = inferProductCategoryLabel(p);
      if (selectedCategories.length > 0 && !selectedCategories.includes(cat)) {
        return false;
      }
      if (q) {
        const hay = `${p.title || ''} ${p.description || ''} ${cat} ${p.brand || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, selectedCategories, catalogSearch]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const p of filteredProducts) {
      const cat = inferProductCategoryLabel(p);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
  }, [filteredProducts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl mx-auto p-12">
          <h2 className="text-3xl font-extrabold text-white">{t('Company Not Found')}</h2>
          <p className="text-slate-400 mt-2">
            {t('The company profile you are looking for does not exist.')}
          </p>
          <Link to="/marketplace" className="mt-6 inline-flex btn-primary">
            {t('Return to Marketplace')}
          </Link>
        </div>
      </div>
    );
  }

  const companyTitle = `${company.companyName || 'Company Profile'} | Hatake B2B Partner`;
  const companyUrl = `https://b2b.hatake.shop/company/${id}`;
  const companyImage =
    company?.bannerUrl ||
    company?.profilePictureUrl ||
    company?.logoUrl ||
    'https://b2b.hatake.shop/og-image.png';
  const companyDesc = company.bio
    ? company.bio.slice(0, 160)
    : `Verified B2B wholesale partner profile for ${company.companyName} on B2B.Hatake.Shop.`;

  const renderCompanyProductCard = (p: any) => {
    let images: string[] = [];
    try {
      images = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]');
    } catch {}
    let tiers: any[] = [];
    try {
      tiers = Array.isArray(p.tieredPricing) ? p.tieredPricing : JSON.parse(p.tieredPricing || '[]');
    } catch {}
    const tierPrices = (Array.isArray(tiers) ? tiers : [])
      .map((tier: any) => Number(tier.price ?? tier.unitPrice))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    const basePrice = Number(p.unitCost ?? p.unitPrice);
    const lowestPrice =
      tierPrices.length > 0
        ? Math.min(...tierPrices)
        : Number.isFinite(basePrice) && basePrice > 0
          ? basePrice
          : null;
    const catLabel = inferProductCategoryLabel(p);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        key={p.id}
        onClick={() => setSelectedProduct({ product: p, seller: company })}
        className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer flex flex-col"
      >
        <div className="aspect-square bg-slate-950/70 overflow-hidden relative border-b border-slate-800/80">
          <SafeImage
            src={optimizeImageUrl(images[0], 500)}
            alt={p.title}
            fallbackIcon={<Package className="w-8 h-8 text-slate-600" />}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            <span className="bg-slate-950/90 backdrop-blur text-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-slate-700">
              MOQ: {p.moq || 1}
            </span>
          </div>
          <div className="absolute top-2.5 right-2.5">
            <span className="bg-indigo-500/15 backdrop-blur text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-indigo-500/30">
              {catLabel}
            </span>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-100 line-clamp-2 mb-1 group-hover:text-cyan-400 transition-colors text-sm leading-snug">
              {p.title}
            </h3>
            {p.description && (
              <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
            <div>
              {lowestPrice ? (
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    {t('Wholesale')}
                  </div>
                  <div className="text-base font-black text-white tabular-nums">
                    {formatPrice(lowestPrice)}
                    <span className="text-slate-400 text-[11px] font-normal">/{t('unit')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-300">{t('Price on request')}</div>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addItem({
                  productId: p.id,
                  title: p.title,
                  image: images[0] || '',
                  sellerId: company.id,
                  sellerName: company.companyName,
                  moq: Number(p.moq) || 1,
                  unitCost: lowestPrice || 10,
                  quantity: Math.max(1, Number(p.moq) || 1),
                });
                toast.success(`${t('Added to B2B RFQ / Sample Cart')}: ${p.title}`);
              }}
              className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 transition-colors cursor-pointer"
              title={t('Add to RFQ / Sample Cart')}
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Helmet>
        <title>{companyTitle}</title>
        <meta name="description" content={companyDesc} />
        <link rel="canonical" href={companyUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={companyTitle} />
        <meta property="og:description" content={companyDesc} />
        <meta property="og:image" content={companyImage} />
        <meta property="og:url" content={companyUrl} />
      </Helmet>

      {/* Hero Banner */}
      <div className="relative h-48 md:h-60 bg-gradient-to-br from-slate-800 via-indigo-950/60 to-slate-950 overflow-hidden rounded-t-3xl">
        {company?.bannerUrl && (
          <img
            src={company.bannerUrl}
            alt="Banner"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-16 relative z-10">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 mb-10">
          <div className="w-28 h-28 rounded-3xl overflow-hidden bg-slate-900 border-4 border-slate-950 shadow-2xl shrink-0 flex items-center justify-center relative">
            <SafeImage
              src={company?.profilePictureUrl || company?.logoUrl}
              alt={company.companyName}
              fallbackIcon={
                <span className="text-4xl font-black text-white">
                  {company.companyName?.charAt(0) || '?'}
                </span>
              }
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {company.companyName}
              </h1>
              <VerificationBadge status={company.verificationStatus} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              {company.country && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  {company.country}
                </span>
              )}
              {company.website && (
                <a
                  href={
                    /^https?:\/\//i.test(company.website)
                      ? company.website
                      : `https://${company.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
                >
                  <Globe2 className="w-4 h-4" />
                  {company.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                </a>
              )}
              <span>
                {t('Member since')} {new Date(company.createdAt).getFullYear()}
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                {products.length} {t('Listings')} ({companyCategories.length} {t('Categories')})
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            {galleryAssets.length > 0 && (
              <button
                type="button"
                onClick={() => setIsSpotlightOpen(true)}
                className="btn-secondary cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 mr-2 text-cyan-400" />
                <span>
                  {t('Gallery')} ({galleryAssets.length})
                </span>
              </button>
            )}

            {user && (
              <button
                type="button"
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={`btn-secondary flex items-center gap-2 cursor-pointer ${
                  followData?.following ? 'border-cyan-500 text-cyan-400' : ''
                }`}
              >
                {followData?.following ? (
                  <UserMinus className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {followData?.following ? t('Connected') : t('Connect / Follow')}
              </button>
            )}
            <button
              type="button"
              onClick={handleContact}
              disabled={isContacting}
              className="btn-primary disabled:opacity-50 cursor-pointer"
            >
              <Mail className="w-4 h-4 mr-2" /> {t('Contact Supplier')}
            </button>
          </div>
        </div>

        {/* ── Customer Reviews (If any) ── */}
        {reviews.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('Customer Reviews')}</h2>
            </div>
            <VendorReviews vendorId={company.id} />
          </section>
        )}

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {/* Multi-Category Company Catalog Section */}
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                    <Package className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-extrabold text-white">
                        {t('Product Catalog & Categories')}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                        {filteredProducts.length} / {products.length} {t('Products')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('Select one or multiple categories below to filter this company’s listings, or switch to Grouped by Category view.')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Switcher: Grid vs Grouped by Category */}
                  <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setCatalogViewMode('grid')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        catalogViewMode === 'grid'
                          ? 'bg-cyan-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>{t('Grid')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogViewMode('grouped')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        catalogViewMode === 'grouped'
                          ? 'bg-cyan-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Rows3 className="w-3.5 h-3.5" />
                      <span>{t('By Category')}</span>
                    </button>
                  </div>

                  <Link
                    to={`/company/${id}/listings`}
                    onClick={() => window.scrollTo(0, 0)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3.5 py-2 rounded-xl hover:bg-cyan-500/10 transition-all"
                  >
                    <span>{t('Full Page View')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Multi-Select Category Chips + Live Search Bar */}
              {products.length > 0 && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategories([]);
                        setVisibleCount(12);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedCategories.length === 0
                          ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{t('All Categories')}</span>
                      <span className="text-[11px] opacity-80">({products.length})</span>
                    </button>

                    {companyCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => toggleCategorySelection(cat.name)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          <span>{cat.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-black/25 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}

                    {selectedCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategories([])}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t('Clear selection')}</span>
                      </button>
                    )}
                  </div>

                  {/* Search inside Company's Catalog */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => {
                        setCatalogSearch(e.target.value);
                        setVisibleCount(12);
                      }}
                      placeholder={`${t('Search within')} ${company.companyName} (${products.length} ${t('products')})...`}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Render Either Grouped-by-Category Sections or Progressive Grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-500">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>{t('No products matched your selected categories.')}</p>
                </div>
              ) : catalogViewMode === 'grouped' ? (
                <div className="space-y-8">
                  {groupedProducts.map((grp) => (
                    <div
                      key={grp.category}
                      className="bg-slate-900/50 border border-slate-800/90 rounded-3xl p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-extrabold text-white">{grp.category}</h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold">
                            {grp.items.length} {t('Products')}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grp.items.map((p) => renderCompanyProductCard(p))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProducts.slice(0, visibleCount).map((p: any) => renderCompanyProductCard(p))}
                  </div>

                  {/* Downward Arrow Load More Button */}
                  {visibleCount < filteredProducts.length && (
                    <div className="flex flex-col items-center justify-center pt-2 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 12)}
                        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-slate-100 font-extrabold text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
                      >
                        <span>
                          {t('Load More Products')} ({visibleCount} / {filteredProducts.length})
                        </span>
                        <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce" />
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* About */}
            {company.aboutUs && company.aboutUs.trim() !== '' && (
              <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{t('About Us')}</h2>
                </div>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {company.aboutUs}
                </div>
              </section>
            )}

            {/* Portfolio */}
            {company.portfolio && company.portfolio.length > 0 && (
              <div className="space-y-5">
                {company.portfolio.map((block: any, idx: number) => (
                  <section key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4">{block.title}</h3>
                    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {block.content}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-5">
                {t('Company Info')}
              </h3>
              <ul className="space-y-4">
                {company.orgNumber && (
                  <li>
                    <div className="text-xs text-slate-500 mb-0.5">{t('Org. Number')}</div>
                    <div className="text-sm font-semibold text-slate-200">{company.orgNumber}</div>
                  </li>
                )}
                {company.vatNumber && (
                  <li>
                    <div className="text-xs text-slate-500 mb-0.5">{t('VAT Number')}</div>
                    <div className="text-sm font-semibold text-slate-200">{company.vatNumber}</div>
                  </li>
                )}
                {company.country && (
                  <li>
                    <div className="text-xs text-slate-500 mb-0.5">{t('Country')}</div>
                    <div className="text-sm font-semibold text-slate-200">{company.country}</div>
                  </li>
                )}
                {company.region && (
                  <li>
                    <div className="text-xs text-slate-500 mb-0.5">{t('Region')}</div>
                    <div className="text-sm font-semibold text-slate-200">{company.region}</div>
                  </li>
                )}
                {company.socialLinks && company.socialLinks.length > 0 && (
                  <li className="pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">{t('Links')}</div>
                    <div className="flex flex-wrap gap-2">
                      {company.socialLinks.map((link: any, idx: number) => {
                        const rawUrl = typeof link === 'string' ? link : link?.url || '';
                        if (!rawUrl) return null;
                        const safeHref = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
                        const label =
                          typeof link === 'object' && link?.platform
                            ? link.platform
                            : rawUrl.replace(/^https?:\/\//i, '').split('/')[0];
                        return (
                          <a
                            key={idx}
                            href={safeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                          >
                            {label} <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        );
                      })}
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {teamMembers && teamMembers.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-5 flex items-center gap-2">
                  <User className="w-4 h-4" /> {t('Team')}
                </h3>
                <ul className="space-y-3">
                  {teamMembers.map((member: any) => (
                    <li key={member.id}>
                      <Link
                        to={`/user/${member.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          <SafeImage
                            src={member.profilePictureUrl}
                            alt={member.displayName || 'Member'}
                            fallbackIcon={
                              <span className="text-white font-bold text-xs">
                                {member.displayName?.charAt(0) || 'U'}
                              </span>
                            }
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-200 truncate">
                            {member.displayName || 'Member'}
                          </div>
                          <div className="text-xs text-slate-500">{getMemberRoleLabel(member)}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {reviews.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-12 relative z-10">
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('Customer Reviews')}</h2>
            </div>
            <VendorReviews vendorId={company.id} />
          </section>
        </div>
      )}

      <SpotlightGallery
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        images={allImages}
        items={galleryAssets}
        companyName={company.companyName}
      />
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
