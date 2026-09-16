import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext.tsx';
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Building2, MapPin, Globe2, BadgeCheck, ExternalLink, Mail, Package, ChevronRight, Star, ArrowRight, User } from 'lucide-react';
import { SpotlightGallery } from '../components/SpotlightGallery.tsx';
import { Maximize2 } from 'lucide-react';
import { VendorReviews } from '../components/VendorReviews.tsx';
import { toast } from 'sonner';

export function CompanyProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isContacting, setIsContacting] = useState(false);

  const handleContact = async () => {
    if (!user) { toast.error('Please log in to contact the supplier'); navigate('/login'); return; }
    setIsContacting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api-v2/seller/${id}/contact`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const newInq = await res.json();
      if (res.ok) { toast.success('Message thread created!'); navigate(`/rfq/${newInq.id}`); }
      else toast.error(newInq.error || 'Failed to start conversation');
    } catch (err: any) { toast.error(err.message || 'Network error'); }
    finally { setIsContacting(false); }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['companyProfile', id],
    queryFn: async () => {
      const res = await fetch(`/api-v2/company/${id}`);
      if (!res.ok) throw new Error('Failed to fetch company profile');
      return res.json();
    }
  });

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex justify-center items-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div></div>;

  if (error || !data?.company) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl mx-auto p-12">
        <h2 className="text-3xl font-extrabold text-white">{t('Company Not Found')}</h2>
        <p className="text-slate-400 mt-2">{t('The company profile you are looking for does not exist.')}</p>
        <Link to="/marketplace" className="mt-6 inline-flex btn-primary">{t('Return to Marketplace')}</Link>
      </div>
    </div>
  );

  const { company, teamMembers, products } = data;

  const allImages = (() => {
    if (!products) return [];
    const imgs: string[] = products.flatMap((p: any) => {
      try { return Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch { return []; }
    });
    if (company.profilePictureUrl) imgs.push(company.profilePictureUrl);
    if (company.bannerUrl) imgs.push(company.bannerUrl);
    return imgs.filter(Boolean);
  })();

  const previewProducts = (products || []).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Helmet>
        <title>{company.companyName || 'Company Profile'} | Hatake</title>
        <meta name="description" content={`View the company profile for ${company.companyName} on Hatake Marketplace.`} />
      </Helmet>

      {/* Hero Banner */}
      <div className="relative h-52 md:h-64 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 overflow-hidden">
        {company.bannerUrl && <img src={company.bannerUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-8 -mt-16 relative z-10">

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 mb-10">
          <div className="w-28 h-28 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-950 shadow-2xl shrink-0 flex items-center justify-center">
            {company.profilePictureUrl
              ? <img src={company.profilePictureUrl} alt={company.companyName} className="w-full h-full object-cover" />
              : <span className="text-4xl font-black text-white">{company.companyName?.charAt(0) || '?'}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{company.companyName}</h1>
              {company.verificationStatus === 'verified' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
              {company.verificationTier === 'gold' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold">⭐ Gold</span>}
              {company.verificationTier === 'audited' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold">🔍 Audited</span>}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              {company.country && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{company.country}</span>}
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"><Globe2 className="w-4 h-4" />{company.website}</a>}
              <span>Member since {new Date(company.createdAt).getFullYear()}</span>
              {products && <span className="flex items-center gap-1.5"><Package className="w-4 h-4" />{products.length} Listings</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {allImages.length > 0 && (
              <button onClick={() => setIsSpotlightOpen(true)} className="btn-secondary">
                <Maximize2 className="w-4 h-4 mr-2" /> Gallery
              </button>
            )}
            <button onClick={handleContact} disabled={isContacting} className="btn-primary disabled:opacity-50">
              <Mail className="w-4 h-4 mr-2" /> Contact Supplier
            </button>
          </div>
        </div>

        {/* ── Reviews First ── */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Customer Reviews</h2>
          </div>
          <VendorReviews vendorId={company.id} />
        </section>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-10">

            {/* Product Preview */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                    <Package className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Featured Listings</h2>
                  <span className="text-sm text-slate-500">({products?.length || 0} total)</span>
                </div>
                {products && products.length > 4 && (
                  <Link to={`/company/${id}/listings`} className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-xl hover:bg-cyan-500/10 transition-all">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {previewProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {previewProducts.map((p: any) => {
                      let images: string[] = [];
                      try { images = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'); } catch {}
                      let tiers: any[] = [];
                      try { tiers = Array.isArray(p.tieredPricing) ? p.tieredPricing : JSON.parse(p.tieredPricing || '[]'); } catch {}
                      const lowestPrice = tiers.length > 0 ? Math.min(...tiers.map((t: any) => Number(t.unitPrice))) : null;
                      return (
                        <div key={p.id} onClick={() => navigate('/marketplace')} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer flex flex-col">
                          <div className="aspect-[4/3] bg-slate-800 overflow-hidden relative">
                            {images[0]
                              ? <img src={images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              : <div className="w-full h-full flex items-center justify-center text-slate-600"><Package className="w-8 h-8" /></div>}
                            <div className="absolute top-2 left-2">
                              <span className="bg-slate-900/90 backdrop-blur text-slate-300 text-[10px] font-semibold px-2 py-1 rounded-full border border-slate-700">MOQ: {p.moq || '—'}</span>
                            </div>
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-semibold text-slate-200 line-clamp-1 mb-1 group-hover:text-cyan-400 transition-colors text-sm">{p.title}</h3>
                            {p.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description}</p>}
                            <div className="mt-auto">
                              {lowestPrice
                                ? <div><div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">From</div><div className="text-base font-bold text-white">${lowestPrice.toFixed(2)}<span className="text-slate-500 text-xs font-normal">/unit</span></div></div>
                                : <div className="text-sm font-medium text-slate-400">Price on request</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {products && products.length > 4 && (
                    <div className="mt-6 flex justify-center">
                      <Link to={`/company/${id}/listings`} className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all duration-300 text-slate-300 hover:text-white font-semibold">
                        <span>View all {products.length} products from {company.companyName}</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-500">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>{t('No products listed publicly yet.')}</p>
                </div>
              )}
            </section>

            {/* About */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30"><Building2 className="w-5 h-5 text-indigo-400" /></div>
                <h2 className="text-2xl font-bold text-white">About Us</h2>
              </div>
              <div className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                {company.aboutUs || "This company hasn't added a description yet."}
              </div>
            </section>

            {/* Portfolio */}
            {company.portfolio && company.portfolio.length > 0 && (
              <div className="space-y-5">
                {company.portfolio.map((block: any, idx: number) => (
                  <section key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4">{block.title}</h3>
                    <div className="text-slate-400 whitespace-pre-wrap leading-relaxed">{block.content}</div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-5">Company Info</h3>
              <ul className="space-y-4">
                {company.orgNumber && <li><div className="text-xs text-slate-500 mb-0.5">Org. Number</div><div className="text-sm font-semibold text-slate-200">{company.orgNumber}</div></li>}
                {company.vatNumber && <li><div className="text-xs text-slate-500 mb-0.5">VAT Number</div><div className="text-sm font-semibold text-slate-200">{company.vatNumber}</div></li>}
                {company.country && <li><div className="text-xs text-slate-500 mb-0.5">Country</div><div className="text-sm font-semibold text-slate-200">{company.country}</div></li>}
                {company.region && <li><div className="text-xs text-slate-500 mb-0.5">Region</div><div className="text-sm font-semibold text-slate-200">{company.region}</div></li>}
                {company.socialLinks && company.socialLinks.length > 0 && (
                  <li className="pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">Links</div>
                    <div className="flex flex-wrap gap-2">
                      {company.socialLinks.map((link: any, idx: number) => (
                        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors">
                          {link.platform} <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ))}
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {teamMembers && teamMembers.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-5 flex items-center gap-2"><User className="w-4 h-4" /> Team</h3>
                <ul className="space-y-3">
                  {teamMembers.map((member: any) => (
                    <li key={member.id}>
                      <Link to={`/user/${member.id}`} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        {member.profilePictureUrl
                          ? <img src={member.profilePictureUrl} alt={member.displayName} className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm border border-slate-700 shrink-0">{member.displayName?.charAt(0) || 'U'}</div>}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-200 truncate">{member.displayName || 'Member'}</div>
                          <div className="text-xs text-slate-500">{member.teamRole === 'owner' ? 'Admin' : member.teamRole === 'sales_rep' ? 'Sales Rep' : 'Catalog Mgr'}</div>
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

      <SpotlightGallery isOpen={isSpotlightOpen} onClose={() => setIsSpotlightOpen(false)} images={allImages} companyName={company.companyName} />
    </div>
  );
}
