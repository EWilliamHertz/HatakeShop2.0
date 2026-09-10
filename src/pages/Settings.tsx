import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { toast } from 'sonner';
import { Loader2, Save, Languages, Users, Upload, User, Mail, Lock } from 'lucide-react';
import { AffiliateDashboard } from './AffiliateDashboard.tsx';

export function Settings() {
  const { t } = useTranslation();
  const { user, dbUser, updateDbUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

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
            {activeTab === 'referral' ? (
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
