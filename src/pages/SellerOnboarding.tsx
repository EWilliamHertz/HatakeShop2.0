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
      const updateRes = await fetch('/api-v2/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer \${await user.getIdToken()}` },
        body: JSON.stringify({
          companyName: formData.companyName,
          vatNumber: formData.vatNumber,
          country: formData.country,
          orgNumber: formData.orgNumber
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10"></div>

      <div className="w-full max-w-3xl relative z-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3 text-center tracking-tight">{t('Become a Verified Seller')}</h1>
        <p className="text-slate-400 text-center mb-12 text-lg">{t('Join Hatake.Shop and reach thousands of wholesale buyers globally.')}</p>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-16 relative px-4">
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-800 -z-10 rounded-full"></div>
          <div className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500 -z-10 rounded-full" style={{ width: `calc(\${((step - 1) / 3) * 100}% - 4rem)` }}></div>
          
          {[
            { icon: <Building2 className="w-5 h-5" />, label: "Company Info" },
            { icon: <FileText className="w-5 h-5" />, label: "Verification" },
            { icon: <Store className="w-5 h-5" />, label: "Review" },
            { icon: <CheckCircle2 className="w-5 h-5" />, label: "Done" }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-lg \${step > i ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 border-slate-900 text-white shadow-cyan-500/30' : step === i + 1 ? 'bg-slate-800 border-cyan-500 text-cyan-400 shadow-cyan-500/20 scale-110' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                {item.icon}
              </div>
              <span className={`text-xs font-bold mt-4 uppercase tracking-wider transition-colors \${step >= i + 1 ? 'text-white' : 'text-slate-600'}`}>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/50">
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
                <p className="text-sm text-slate-300 mb-4">{t('To maintain a trusted B2B network, we require proof of business registration. Please provide your VAT Number or Organization Number. We will automatically verify your business.')}</p>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{t('VAT Number (Optional)')}</label>
                  <input type="text" value={formData.vatNumber} onChange={e => setFormData({...formData, vatNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-between pt-6">
                <button onClick={handlePrev} className="px-6 py-2.5 text-slate-400 hover:text-white font-semibold rounded-lg transition-colors">{t('Back')}</button>
                <button onClick={handleNext} className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors">{t('Next Step')}</button>
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
                <div className="flex justify-between"><span className="text-slate-400">VAT Number</span><span className="text-white font-medium">{formData.vatNumber || 'N/A'}</span></div>
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
