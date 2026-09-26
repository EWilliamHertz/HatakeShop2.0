import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { toast } from 'sonner';
import { Loader2, Save, Languages, Users, Upload, User, Mail, Lock , Code} from 'lucide-react';
import { AffiliateDashboard } from './AffiliateDashboard.tsx';

export function Settings() {
  const { t } = useTranslation();
  const { user, dbUser, updateDbUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showApiDocsModal, setShowApiDocsModal] = useState(false);

  const [formData, setFormData] = useState({
    displayName: dbUser?.displayName || '',
    email: user?.email || dbUser?.email || '',
    profilePictureUrl: dbUser?.profilePictureUrl || '',
    autoTranslate: dbUser?.autoTranslate || false,
    preferredLanguage: dbUser?.preferredLanguage || 'English',
  });

  React.useEffect(() => {
    if (dbUser) {
      setFormData(prev => ({
        ...prev,
        displayName: dbUser.displayName || '',
        profilePictureUrl: dbUser.profilePictureUrl || '',
        autoTranslate: dbUser.autoTranslate || false,
        preferredLanguage: dbUser.preferredLanguage || 'English',
      }));
    }
  }, [dbUser]);

  if (!dbUser) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /><p className="mt-4 text-slate-400">{t('Loading your profile...')}</p></div>;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '6f1a5bbe6a6a3a4fb49fd2f8b303d8f5';
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formDataUpload
        });
        const data = await res.json();
        if (data.success) {
          setFormData(prev => ({ ...prev, profilePictureUrl: data.data.url }));
          toast.success("Image uploaded successfully");
        } else {
          toast.error("Failed to upload image to ImgBB");
        }
      } catch (err) {
        toast.error("Error uploading image");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let token;
      try { 
        token = await user?.getIdToken(); 
      } catch (e: any) { 
        toast.error("Firebase Auth error: " + e.message);
        setLoading(false);
        return;
      }
      
      const doFetch = async () => {
        return await fetch('/api-v2/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
      };

      let res;
      try {
        res = await doFetch();
      } catch (fetchErr: any) {
        await new Promise(r => setTimeout(r, 1000));
        res = await doFetch();
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.cause ? `${data.error}: ${data.cause}` : (data.error || "Failed to save settings"));
        return;
      }
      updateDbUser(data);
      toast.success("Settings saved successfully.");
    } catch (error: any) {
      console.error(error);
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', name: 'Personal Profile', icon: User },
    { id: 'preferences', name: 'Preferences', icon: Languages },
    { id: 'referral', name: 'Partner Referral Program', icon: Users },
    { id: 'api', name: 'Developer API', icon: Code },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-72 shrink-0">
        <h1 className="heading-xl mb-2">
          {t('Settings')}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {t('Manage your personal settings and preferences.')}
        </p>

        <nav className="flex flex-col space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-[var(--color-accent)] text-white' 
                    : 'text-slate-400 hover:bg-[var(--color-canvas)] hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{t(tab.name)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl min-h-[600px] p-0 overflow-hidden">
          <div className="p-6 md:p-8">
            
            {activeTab === 'api' ? (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div>
                    <h3 className="text-3xl font-black tracking-tighter text-white mb-2 flex items-center gap-3">
                       <Code className="w-8 h-8 text-cyan-400" />
                       Developer API
                       <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-widest border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">v2.0 Beta</span>
                    </h3>
                    <p className="text-slate-400 text-base max-w-2xl">Use your secure API key to automatically sync Hatake.Shop's live wholesale inventory directly into your Shopify, WooCommerce, or custom ERP systems.</p>
                 </div>
                 
                 <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
                       <div className="absolute top-0 right-0 p-32 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                       
                       <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-widest flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                          Production API Key
                       </h4>
                       <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 relative">
                             <input type="text" readOnly value="hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6" className="w-full pl-4 pr-12 py-3.5 bg-black/50 border border-white/10 text-cyan-300 font-mono text-sm rounded-xl outline-none focus:border-cyan-500/50 transition-colors shadow-inner selection:bg-cyan-500/30" />
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText('hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6'); alert('Copied API Key to clipboard!'); }} className="px-6 py-3.5 bg-white text-black hover:bg-slate-200 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] whitespace-nowrap">
                             Copy Key
                          </button>
                          <button className="px-6 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl transition-all border border-rose-500/20 hover:border-rose-500/50 whitespace-nowrap">
                             Revoke
                          </button>
                       </div>
                       <p className="text-xs text-slate-500 mt-4 max-w-xl leading-relaxed">
                          <strong className="text-rose-400 font-semibold">Security Warning:</strong> Treat this key like a password. It grants read-only access to your negotiated pricing tiers and global inventory allocations. Do not expose it in client-side code.
                       </p>
                    </div>
                 </div>
                 
                 <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                       </div>
                       <div className="text-xs font-mono text-slate-500 tracking-wider">Node.js Integration Example</div>
                    </div>
                    <div className="p-6 overflow-x-auto">
                       <pre className="text-sm font-mono leading-relaxed text-slate-300">
{`import fetch from 'node-fetch';

// Initialize client connection to Hatake API
const syncInventory = async () => {
  try {
    const response = await fetch('https://api.hatake.shop/v2/inventory/sync', {
      headers: {
        'Authorization': 'Bearer hk_prod_9f8c2e1...',
        'Content-Type': 'application/json'
      }
    });

    const { data } = await response.json();
    console.log("Successfully synced " + data.length + " products");
    
    // Push to Shopify/ERP...
    await shopifyClient.bulkUpdate(data);
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
};`}
</pre>
                    </div>
                 </div>
               </div>
            ) : activeTab === 'referral' ? (
              <div className="-m-6 md:-m-8">
                <AffiliateDashboard />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {activeTab === 'personal' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-2xl font-bold text-white border-b border-[var(--color-hairline)] pb-2">{t('Personal Information')}</h3>
                    
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-semibold tracking-tight text-slate-300 flex justify-between">
                        <span>{t('Profile Picture')}</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 shrink-0 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-full flex items-center justify-center overflow-hidden">
                          {formData.profilePictureUrl ? (
                            <img src={formData.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all w-full flex items-center justify-center px-4 py-2 cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" /> {t('Upload Profile Image')}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-semibold tracking-tight text-slate-300 flex items-center">
                          <User className="w-4 h-4 mr-2 text-slate-400" /> {t('Display Name')}
                        </label>
                        <input
                          type="text" name="displayName"
                          value={formData.displayName} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-semibold tracking-tight text-slate-300 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-slate-400" /> {t('Email Address')}
                        </label>
                        <input
                          type="email" name="email" disabled
                          value={formData.email} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-400 rounded-xl cursor-not-allowed opacity-70"
                        />
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-semibold tracking-tight text-slate-300 flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-slate-400" /> {t('Password')}
                        </label>
                        <input
                          type="password" name="password" disabled value="********"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-400 rounded-xl cursor-not-allowed opacity-70"
                        />
                        <span className="text-xs text-slate-400">{t('Password management is handled via the login provider.')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-2xl font-bold text-white border-b border-[var(--color-hairline)] pb-2">{t('System Preferences')}</h3>
                    
                    <div className="p-5 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                           <h4 className="font-semibold tracking-tight text-slate-200">{t('Auto-Translate Messages')}</h4>
                           <p className="text-sm text-slate-400">{t('Automatically translate incoming quotes and messages into your preferred language.')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" name="autoTranslate" checked={formData.autoTranslate} onChange={handleChange} className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                        </label>
                      </div>
                      
                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-semibold tracking-tight text-slate-200">{t('Preferred Language')}</label>
                        <select 
                          name="preferredLanguage" 
                          value={formData.preferredLanguage} 
                          onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="English">{t('English')}</option>
                          <option value="Mandarin">{t('Mandarin (中文)')}</option>
                          <option value="Japanese">{t('Japanese (日本語)')}</option>
                          <option value="Spanish">{t('Spanish (Español)')}</option>
                          <option value="German">{t('German (Deutsch)')}</option>
                          <option value="French">{t('French (Français)')}</option>
                          <option value="Swedish">{t('Swedish (Svenska)')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-[var(--color-hairline)] flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 px-6 py-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5 mr-2" />
                    )}
                    {t('Save Settings')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
