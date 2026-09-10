import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext.tsx';
import { Building2, Loader2, ArrowRight } from 'lucide-react';

export function JoinCompany() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
       setError("You must be signed in to join a company.");
       return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let token; try { token = await user.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/users/team/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      if (res.ok) {
         navigate('/seller'); // or wherever they should go
      } else {
         setError(data.error || "Failed to join team");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-accent-light text-[#ffcc00] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">{t('Join a Company')}</h1>
        <p className="text-slate-400 mb-8 font-medium">{t('Enter the secret invite code provided by your team administrator.')}</p>

        <form onSubmit={handleJoin} className="space-y-5 text-left">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-lg text-center">{error}</div>}
          
          <div>
            <label className="block text-sm font-semibold text-slate-100 mb-1.5">{t('Secret Invite Code')}</label>
            <input 
              type="text" required
              placeholder="SEC-XXXXXXXX"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono tracking-widest text-center uppercase"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !code}
            className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 w-full shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>{t('Join Workspace')} <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </button>
        </form>

        {!user && (
          <p className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700 font-semibold shadow-sm">
            {t('Note: You need to register an account and sign in before you can join a team workspace.')}
          </p>
        )}
      </div>
    </div>
  );
}
