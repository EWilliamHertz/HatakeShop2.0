import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { useTranslation } from 'react-i18next';
import { Users, DollarSign, ExternalLink, Link2, TrendingUp, Gift } from 'lucide-react';
import { toast } from 'sonner';

export function AffiliateDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      try {
        let token; try { token = await user.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
        const res = await fetch('/api-v2/affiliates/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  const copyLink = async () => {
    if (!stats?.referralCode) {
      toast.error("Referral code not available.");
      return;
    }
    const url = `${window.location.origin}/register?ref=${stats.referralCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied!");
    } catch (err) {
      // Fallback for iframe limitations
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success("Referral link copied (fallback)!");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">{t('Loading dashboard...')}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="mb-10 text-center">
        <h1 className="heading-xl mb-4 flex justify-center items-center gap-3">
          <Gift className="w-8 h-8 text-[#ffcc00]" />
          Partner Referral Program
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Invite vendors and buyers to Hatake.Shop and earn a 1% commission on their lifetime Gross Merchandise Value (GMV).
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8 text-center">
        <h2 className="text-2xl font-bold text-white text-slate-400 uppercase tracking-wider mb-4">{t('Your Unique Invite Link')}</h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <input 
            type="text" 
            readOnly
            className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono text-lg truncate max-w-md w-full bg-slate-900 text-center sm:text-left"
            value={`${window.location.origin}/register?ref=${stats?.referralCode || ''}`}
          />
          <button onClick={copyLink} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 whitespace-nowrap">
            <Link2 className="w-5 h-5" />
            Copy Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-900 text-[#ffcc00] rounded-full flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-slate-400 text-sm font-medium">{t('Referred Partners')}</p>
          <p className="text-3xl font-extrabold text-white mt-2">{stats?.totalSignups || 0}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-900 text-[#ffcc00] rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-slate-400 text-sm font-medium">{t('Network GMV')}</p>
          <p className="text-3xl font-extrabold text-white mt-2">${(stats?.totalGmv || 0).toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-900 text-[#ffcc00] rounded-full flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-slate-400 text-sm font-medium">{t('Commission Earned')}</p>
          <p className="text-3xl font-extrabold text-white mt-2">${(stats?.commissionEarned || 0).toLocaleString()}</p>
        </div>
      </div>

    </div>
  );
}
