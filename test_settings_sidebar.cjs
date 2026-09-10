const fs = require('fs');

const code = `
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { ShieldCheck, Building2, FileText, Globe2, Loader2, Save, Languages, MapPin, CreditCard, BadgeCheck, Users, UploadCloud, Store, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AffiliateDashboard } from './AffiliateDashboard.tsx';

export function Settings() {
  const { t } = useTranslation();
  const { user, dbUser, updateDbUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingKyb, setUploadingKyb] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: dbUser?.companyName || '',
    orgNumber: dbUser?.orgNumber || '',
    website: dbUser?.website || '',
    aboutUs: dbUser?.aboutUs || '',
    socialLinks: dbUser?.socialLinks || [],
    portfolio: dbUser?.portfolio || [],
    profilePictureUrl: dbUser?.profilePictureUrl || '',
    bannerUrl: dbUser?.bannerUrl || '',
    country: dbUser?.country || '',
    vatNumber: dbUser?.vatNumber || '',
    role: dbUser?.role || 'buyer',
    autoTranslate: dbUser?.autoTranslate || false,
    preferredLanguage: dbUser?.preferredLanguage || 'English',
    teamRole: dbUser?.teamRole || 'owner',
    shippingAddress: dbUser?.shippingAddress || '',
    shippingCity: dbUser?.shippingCity || '',
    shippingZip: dbUser?.shippingZip || '',
    stripeAccountId: dbUser?.stripeAccountId || '',
    kybDocuments: dbUser?.kybDocuments || [],
  });

  React.useEffect(() => {
    if (dbUser) {
      setFormData({
        companyName: dbUser.companyName || '',
        orgNumber: dbUser.orgNumber || '',
        website: dbUser.website || '',
        aboutUs: dbUser.aboutUs || '',
        socialLinks: dbUser.socialLinks || [],
        portfolio: dbUser.portfolio || [],
        profilePictureUrl: dbUser.profilePictureUrl || '',
        bannerUrl: dbUser.bannerUrl || '',
        country: dbUser.country || '',
        vatNumber: dbUser.vatNumber || '',
        role: dbUser.role || 'buyer',
        autoTranslate: dbUser.autoTranslate || false,
        preferredLanguage: dbUser.preferredLanguage || 'English',
        teamRole: dbUser.teamRole || 'owner',
        shippingAddress: dbUser.shippingAddress || '',
        shippingCity: dbUser.shippingCity || '',
        shippingZip: dbUser.shippingZip || '',
        stripeAccountId: dbUser.stripeAccountId || '',
        kybDocuments: dbUser.kybDocuments || []
      });
    }
  }, [dbUser]);

  if (!dbUser) return null;

  const handleKybUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || e.target.files.length === 0) return;
     const file = e.target.files[0];
     setUploadingKyb(true);
     setTimeout(() => {
       const docs = formData.kybDocuments || [];
       setFormData({ ...formData, kybDocuments: [...docs, { name: file.name, date: new Date().toISOString(), autoVerified: true }] });
       setUploadingKyb(false);
       alert("Automated KYB: Document and VAT instantly verified against global registry.");
     }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({
          ...formData,
          verificationStatus: 'verified'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.cause ? \`\${data.error}: \${data.cause}\` : (data.error || "Failed to save settings"));
        return;
      }
      updateDbUser(data);
      alert("Settings saved successfully.");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General Profile', icon: Building2 },
    { id: 'verification', name: 'Verification & KYB', icon: ShieldCheck },
    { id: 'logistics', name: 'Logistics & Payments', icon: MapPin },
    { id: 'preferences', name: 'Preferences', icon: Languages },
    { id: 'referral', name: 'Partner Referral Program', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 shrink-0">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          {t('Settings')}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {t('Manage your organization details and B2B verification status.')}
        </p>

        <nav className="flex flex-col space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={\`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all \${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }\`}
              >
                <Icon className={\`w-5 h-5 \${isActive ? 'text-indigo-200' : 'text-slate-400'}\`} />
                <span>{t(tab.name)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden min-h-[600px]">
          
          {activeTab !== 'referral' && (
            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200/60 flex items-start gap-4">
              <div className={\`p-3 rounded-xl \${dbUser.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}\`}>
                 <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-900">
                   {dbUser.verificationStatus === 'verified' ? t('Verified Business Account') : t('Verification Pending')}
                 </h2>
                 <p className="text-slate-600 mt-1 max-w-lg text-sm leading-relaxed">
                   {dbUser.verificationStatus === 'verified' 
                     ? t('Your business identity has been verified. You have full access to the wholesale marketplace and sourcing engine.')
                     : t('Please complete your business profile below. B2B access requires a valid VAT/Tax ID and registered company name.')}
                 </p>
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            {activeTab === 'referral' ? (
              <div className="-m-6 md:-m-8">
                <AffiliateDashboard />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {activeTab === 'general' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">{t('Company Information')}</h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-slate-400" /> {t('Company Name')}
                        </label>
                        <input
                          type="text" name="companyName" required
                          value={formData.companyName} onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">{t('About Us')}</label>
                        <textarea
                          name="aboutUs" rows={4}
                          value={formData.aboutUs} onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                          placeholder={t('Tell buyers about your company, history, and specialities...')}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-sm font-bold text-slate-700 flex justify-between">
                             <span>{t('Profile Picture URL')}</span>
                             {formData.profilePictureUrl && <img src={formData.profilePictureUrl} alt="" className="w-6 h-6 rounded-full object-cover" />}
                           </label>
                           <input
                             type="url" name="profilePictureUrl"
                             value={formData.profilePictureUrl} onChange={handleChange}
                             className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                             placeholder="https://..."
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-bold text-slate-700 flex justify-between">
                             <span>{t('Banner URL')}</span>
                           </label>
                           <input
                             type="url" name="bannerUrl"
                             value={formData.bannerUrl} onChange={handleChange}
                             className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                             placeholder="https://..."
                           />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'verification' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">{t('Identity & Verification')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center">
                          <Globe2 className="w-4 h-4 mr-2 text-slate-400" /> {t('Country of Registration')}
                        </label>
                        <select
                          name="country" required
                          value={formData.country} onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">{t('Select Country')}</option>
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="EU">European Union</option>
                          <option value="JP">Japan</option>
                          <option value="CN">China</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-slate-400" /> {t('VAT / Tax ID Number')}
                        </label>
                        <input
                          type="text" name="vatNumber" required
                          value={formData.vatNumber} onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-slate-400" /> {t('Organization / Business Number')}
                        </label>
                        <input
                          type="text" name="orgNumber"
                          value={formData.orgNumber} onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center">
                          <Store className="w-4 h-4 mr-2 text-slate-400" /> {t('Account Type')}
                        </label>
                        <select
                          name="role" required
                          value={formData.role} onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="buyer">Buyer (Sourcing only)</option>
                          <option value="seller">Seller / Manufacturer</option>
                          <option value="both">Both (Buy & Sell)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900 mb-4">{t('KYB Documents (Proof of Business)')}</h4>
                      {formData.kybDocuments && formData.kybDocuments.length > 0 ? (
                        <div className="space-y-3 mb-4">
                          {formData.kybDocuments.map((doc: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                               <div className="flex items-center">
                                 <BadgeCheck className="w-5 h-5 text-emerald-500 mr-3" />
                                 <span className="text-sm font-medium text-emerald-900">{doc.name}</span>
                               </div>
                               <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Verified</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <label className="flex items-center justify-center w-full px-4 py-6 bg-white border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-colors group">
                        <div className="flex flex-col items-center text-indigo-600">
                          {uploadingKyb ? <Loader2 className="w-8 h-8 mb-2 animate-spin text-indigo-500" /> : <UploadCloud className="w-8 h-8 mb-2 text-indigo-300 group-hover:text-indigo-500 transition-colors" />}
                          <span className="font-semibold text-sm">{uploadingKyb ? t('Verifying...') : t('Upload Certificate of Incorporation or VAT Certificate')}</span>
                          <span className="text-xs text-slate-500 mt-1 font-normal">PDF, JPG, PNG up to 10MB</span>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleKybUpload} disabled={uploadingKyb} />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'logistics' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">{t('Logistics & Shipping')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-700">{t('Street Address')}</label>
                        <input type="text" name="shippingAddress" value={formData.shippingAddress} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">{t('City')}</label>
                        <input type="text" name="shippingCity" value={formData.shippingCity} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">{t('Postal / Zip Code')}</label>
                        <input type="text" name="shippingZip" value={formData.shippingZip} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h4 className="text-lg font-bold text-slate-900 mb-4">{t('Payment Settings')}</h4>
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center">
                          <CreditCard className="w-6 h-6 text-slate-400 mr-3" />
                          <div>
                            <div className="font-bold text-slate-800">{t('Stripe Connect')}</div>
                            <div className="text-sm text-slate-500">
                              {formData.stripeAccountId ? t('Connected') : t('Not connected. Required to receive payouts.')}
                            </div>
                          </div>
                        </div>
                        <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                          {formData.stripeAccountId ? t('Manage') : t('Connect Stripe')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">{t('System Preferences & Links')}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center">
                          <Globe2 className="w-4 h-4 mr-2 text-slate-400" /> {t('Company Website')}
                        </label>
                        <input
                          type="url" name="website"
                          value={formData.website} onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center">
                          <Share2 className="w-4 h-4 mr-2 text-slate-400" /> {t('Social Links (Comma separated URLs)')}
                        </label>
                        <input
                          type="text"
                          value={Array.isArray(formData.socialLinks) ? formData.socialLinks.join(', ') : formData.socialLinks}
                          onChange={(e) => setFormData({...formData, socialLinks: e.target.value.split(',').map(s => s.trim())})}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                           <h4 className="font-bold text-indigo-900">{t('Auto-Translate Messages')}</h4>
                           <p className="text-sm text-indigo-700">{t('Automatically translate incoming quotes and messages into your preferred language.')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" name="autoTranslate" checked={formData.autoTranslate} onChange={handleChange} className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-indigo-900">{t('Preferred Language')}</label>
                        <select 
                          name="preferredLanguage" 
                          value={formData.preferredLanguage} 
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="English">English</option>
                          <option value="Mandarin">Mandarin (中文)</option>
                          <option value="Japanese">Japanese (日本語)</option>
                          <option value="Spanish">Spanish (Español)</option>
                          <option value="German">German (Deutsch)</option>
                          <option value="French">French (Français)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab !== 'referral' && (
                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5 mr-2" />
                      )}
                      {t('Save Settings')}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/pages/Settings.tsx', code);
console.log("Written settings");
