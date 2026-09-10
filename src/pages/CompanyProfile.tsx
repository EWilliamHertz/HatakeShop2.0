import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/AuthContext.tsx';
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, FileBadge } from 'lucide-react';
import { Building2, MapPin, Globe2, FileText, BadgeCheck, ExternalLink, Mail, Phone, ShoppingCart, User, Package } from 'lucide-react';
import { cn } from '../components/Layout.tsx';
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
    if (!user) {
      toast.error('Please log in to contact the supplier');
      navigate('/login');
      return;
    }
    setIsContacting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api-v2/seller/${id}/contact`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const newInq = await res.json();
      if (res.ok) {
        toast.success('Message thread created! Check your email.');
        navigate(`/rfq/${newInq.id}`);
      } else {
        toast.error(newInq.error || 'Failed to start conversation');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    } finally {
      setIsContacting(false);
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['companyProfile', id],
    queryFn: async () => {
      const res = await fetch(`/api-v2/company/${id}`);
      if (!res.ok) throw new Error('Failed to fetch company profile');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error || !data?.company) {
    return (
      <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl mx-auto mt-8">
        <h2 className="text-3xl font-extrabold text-white text-slate-100">{t('Company Not Found')}</h2>
        <p className="text-slate-400 font-medium mt-2">{t('The company profile you are looking for does not exist or has been removed.')}</p>
        <Link to="/marketplace" className="mt-6 inline-flex bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 px-4 py-2.5">{t('Return to Marketplace')}</Link>
      </div>
    );
  }

  const { company, teamMembers, products } = data;
  
  // We don't need useMemo here since it's just extracting strings, but to fix the hook order:
  const allImages = (() => {
    if (!products) return [];
    const imgs = products.flatMap((p: any) => p.images || []);
    if (company.profilePictureUrl) imgs.push(company.profilePictureUrl);
    if (company.bannerUrl) imgs.push(company.bannerUrl);
    return imgs.filter(Boolean);
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Helmet>
        <title>{company.companyName || 'Company Profile'} | Hatake</title>
        <meta name="description" content={`View the company profile for ${company.companyName} on Hatake Marketplace.`} />
      </Helmet>
      {/* Header Profile */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-0 overflow-hidden">
        {company.bannerUrl ? (
          <div className="h-32 sm:h-48 md:h-64 bg-slate-900 relative">
            <img src={company.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 sm:h-48 md:h-64 bg-slate-900 border-b border-slate-700 relative"></div>
        )}
        <div className="px-8 pb-8 relative">
          <div className="w-24 h-24 bg-slate-800 rounded-xl shadow-sm border border-slate-700 -mt-12 flex items-center justify-center text-4xl font-semibold text-[#ffcc00] overflow-hidden relative">
            {company.profilePictureUrl ? (
              <img src={company.profilePictureUrl} alt={company.companyName} className="w-full h-full object-cover" />
            ) : (
              company.companyName?.charAt(0) || <Building2 />
            )}
          </div>
          <div className="mt-6 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
            <div>
              <h1 className="heading-xl flex items-center gap-3">
                {company.companyName}
                {company.verificationStatus === 'verified' && company.verificationTier !== 'gold' && company.verificationTier !== 'audited' && (
                  <BadgeCheck className="w-6 h-6 text-blue-600" />
                )}
                {company.verificationTier === 'verified' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    <BadgeCheck className="w-4 h-4" />
                    Verified
                  </span>
                )}
                {company.verificationTier === 'gold' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-100 to-yellow-300 text-yellow-900 border border-yellow-300">
                    <FileBadge className="w-4 h-4" />
                    Gold Supplier
                  </span>
                )}
                {company.verificationTier === 'audited' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-4 h-4" />
                    Audited
                  </span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400 font-medium">
                {company.country && (
                  <span className="flex items-center px-4 py-2.5"><MapPin className="w-4 h-4 mr-1.5 text-slate-400" /> {company.country}</span>
                )}
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-[#ffcc00] transition-colors">
                    <Globe2 className="w-4 h-4 mr-1.5 text-slate-400" /> Website
                  </a>
                )}
                <span className="flex items-center text-slate-400">
                   Member since {new Date(company.createdAt).getFullYear()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsSpotlightOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all flex items-center px-4 py-2.5"
              >
                <Maximize2 className="w-4 h-4 mr-2" /> Enter Spotlight
              </button>
              <button onClick={handleContact} disabled={isContacting} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 flex items-center disabled:opacity-50 px-4 py-2.5">
                <Mail className="w-4 h-4 mr-2" /> Contact Supplier
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: About & Custom Portfolio */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="text-3xl font-extrabold text-white mb-4 flex items-center px-4 py-2.5">
              <Building2 className="w-5 h-5 mr-2 text-[#ffcc00]" /> About Us
            </h2>
            <div className="prose max-w-none text-slate-400 leading-relaxed whitespace-pre-wrap">
              {company.aboutUs || "This company hasn't added a description yet."}
            </div>
          </div>

          {company.portfolio && company.portfolio.length > 0 && (
            <div className="space-y-6">
              {company.portfolio.map((block: any, idx: number) => (
                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-4">{block.title}</h3>
                  <div className="text-slate-400 whitespace-pre-wrap leading-relaxed">{block.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Product Showcase */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="text-3xl font-extrabold text-white mb-6 flex items-center px-4 py-2.5">
              <Package className="w-5 h-5 mr-2 text-[#ffcc00]" /> Public Products ({products?.length || 0})
            </h2>
            {products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((p: any) => (
                  <Link to="/marketplace" key={p.id} className="block p-4 border border-slate-700 rounded-xl hover:border-cyan-500/50 transition-all group bg-slate-800">
                    <div className="aspect-video bg-slate-900 rounded-lg mb-4 overflow-hidden relative">
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">{t('No Image')}</div>
                      )}
                    </div>
                    <h3 className="font-semibold tracking-tight text-slate-100 line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-tight text-[#ffcc00] bg-accent-light px-2 py-1 rounded">MOQ: {p.moq}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">{t('No products listed publicly yet.')}</p>
            )}
          </div>
        </div>

        {/* Right Column: Meta info & Team */}
        <div className="space-y-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">{t('Company Overview')}</h3>
            <ul className="space-y-4">
              {company.orgNumber && (
                <li className="flex flex-col">
                  <span className="text-xs text-slate-400 mb-0.5">{t('Org. Nummer')}</span>
                  <span className="text-sm font-semibold text-slate-100">{company.orgNumber}</span>
                </li>
              )}
              {company.country && (
                <li className="flex flex-col">
                  <span className="text-xs text-slate-400 mb-0.5">{t('Registration Region')}</span>
                  <span className="text-sm font-semibold text-slate-100">{company.country}</span>
                </li>
              )}
              {company.socialLinks && company.socialLinks.length > 0 && (
                <li className="flex flex-col pt-4 border-t border-slate-700">
                  <span className="text-xs text-slate-400 mb-2">{t('Social & External Links')}</span>
                  <div className="flex flex-wrap gap-2">
                    {company.socialLinks.map((link: any, idx: number) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 hover:bg-slate-700 hover:text-[#ffcc00] transition-colors">
                        {link.platform} <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </li>
              )}
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4 flex items-center px-4 py-2.5">
              <User className="w-4 h-4 mr-2" /> Agency Networking / Team
            </h3>
            {teamMembers && teamMembers.length > 0 ? (
              <ul className="space-y-3">
                {teamMembers.map((member: any) => (
                  <li key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center font-semibold text-sm">
                      {member.displayName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold tracking-tight text-slate-100">{member.displayName || 'Unknown Member'}</div>
                      <div className="text-xs text-slate-400">{member.teamRole === 'owner' ? 'Administrator' : member.teamRole === 'sales_rep' ? 'Sales Representative' : 'Catalog Manager'}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-xs font-medium">{t('No public team members listed.')}</p>
            )}
          </div>
          <VendorReviews vendorId={company.id} />
        </div>
      </div>
      <SpotlightGallery 
        isOpen={isSpotlightOpen} 
        onClose={() => setIsSpotlightOpen(false)} 
        images={allImages}
        companyName={company.companyName}
      />
    </div>
  );
}
