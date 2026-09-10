import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import { Store, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SellerOnboarding() {
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: dbUser?.companyName || '',
    vatNumber: dbUser?.vatNumber || '',
    country: dbUser?.country || '',
    kybUrl: '',
    orgNumber: dbUser?.orgNumber || '',
  });

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!user) return;
    try {
      // 1. Update user profile details
      const updateRes = await fetch('/api-v2/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer \${await user.getIdToken()}` },
        body: JSON.stringify({
          companyName: formData.companyName,
          vatNumber: formData.vatNumber,
          country: formData.country,
          orgNumber: formData.orgNumber,
          kybDocuments: formData.kybUrl ? [{ name: 'Business License', url: formData.kybUrl }] : undefined
        })
      });
      if (!updateRes.ok) throw new Error("Failed to update profile");

      // 2. Apply for seller status
      const applyRes = await fetch('/api-v2/users/apply-seller', {
        method: 'POST',
        headers: { 'Authorization': `Bearer \${await user.getIdToken()}` }
      });
      if (!applyRes.ok) throw new Error("Failed to apply for seller status");

      setStep(4); // Success step
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-extrabold text-white mb-2 text-center">{t('Become a Verified Seller')}</h1>
        <p className="text-slate-400 text-center mb-10">{t('Join Hatake.Shop and reach thousands of wholesale buyers globally.')}</p>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-cyan-500 transition-all duration-300 -z-10" style={{ width: `\${((step - 1) / 3) * 100}%` }}></div>
          
          {[
            { icon: <Building2 className="w-5 h-5" />, label: "Company Info" },
            { icon: <FileText className="w-5 h-5" />, label: "Verification" },
            { icon: <Store className="w-5 h-5" />, label: "Review" },
            { icon: <CheckCircle2 className="w-5 h-5" />, label: "Done" }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 \${step > i ? 'bg-cyan-600 border-slate-950 text-white' : step === i + 1 ? 'bg-slate-900 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                {item.icon}
              </div>
              <span className={`text-xs font-semibold mt-2 \${step >= i + 1 ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-white mb-6">{t('Company Information')}</h2>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t('Legal Company Name')}</label>
                <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none" placeholder="e.g. Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{t('Country')}</label>
                  <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{t('Organization Number')}</label>
                  <input type="text" value={formData.orgNumber} onChange={e => setFormData({...formData, orgNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <button onClick={handleNext} disabled={!formData.companyName} className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">{t('Next Step')}</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-white mb-6">{t('Identity Verification (KYB)')}</h2>
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-6">
                <p className="text-sm text-slate-300 mb-4">{t('To maintain a trusted B2B network, we require proof of business registration. Please provide a link to your Business License, VAT Certificate, or Incorporation Document.')}</p>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{t('Document URL')}</label>
                  <input type="text" value={formData.kybUrl} onChange={e => setFormData({...formData, kybUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t('VAT Number (Optional)')}</label>
                <input type="text" value={formData.vatNumber} onChange={e => setFormData({...formData, vatNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <div className="flex justify-between pt-6">
                <button onClick={handlePrev} className="px-6 py-2.5 text-slate-400 hover:text-white font-semibold rounded-lg transition-colors">{t('Back')}</button>
                <button onClick={handleNext} disabled={!formData.kybUrl} className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">{t('Next Step')}</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-xl font-bold text-white mb-4">{t('Review Application')}</h2>
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Company Name</span><span className="text-white font-medium">{formData.companyName}</span></div>
                <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Country</span><span className="text-white font-medium">{formData.country}</span></div>
                <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Org Number</span><span className="text-white font-medium">{formData.orgNumber || 'N/A'}</span></div>
                <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">VAT Number</span><span className="text-white font-medium">{formData.vatNumber || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">KYB Document</span><span className="text-cyan-400 font-medium truncate max-w-[200px]">{formData.kybUrl}</span></div>
              </div>
              <div className="flex justify-between pt-6">
                <button onClick={handlePrev} className="px-6 py-2.5 text-slate-400 hover:text-white font-semibold rounded-lg transition-colors">{t('Back')}</button>
                <button onClick={handleSubmit} className="px-6 py-2.5 bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black font-bold rounded-lg shadow-sm transition-colors">{t('Submit Application')}</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('Application Submitted!')}</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8">{t('Our admin team will review your KYB documents shortly. You will be notified once your seller account is verified.')}</p>
              <button onClick={() => navigate('/seller')} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors">{t('Go to Dashboard')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
