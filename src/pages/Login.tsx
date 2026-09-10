import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogIn, UserPlus, Key, Mail, Loader2, Chrome, User as UserIcon, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function Login() {
  const { signIn, signInWithEmail, registerWithEmail, signInWithCustom } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.has('invite'));
  const [email, setEmail] = useState('');
  const [teamCode, setTeamCode] = useState(searchParams.get('invite') || '');
  
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
       fetch(`/api-v2/invitations/validate?token=${inviteToken}`)
       .then(res => res.json())
       .then(data => {
          if (data.email) setEmail(data.email);
       })
       .catch(() => {});
    }
  }, [searchParams]);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        await registerWithEmail(email, password, name);
        navigate('/');
      } else {
        // Attempt custom backend auth first (to bypass Firebase operation-not-allowed)
        const res = await fetch('/api-v2/auth/custom-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            await signInWithCustom(data.token);
            if (data.role === 'admin') {
              navigate('/admin');
            } else if (data.role === 'seller' || data.role === 'both') {
              navigate('/seller');
            } else {
              navigate('/');
            }
            return;
          }
        } else {
          // If custom login fails (not the admin), fall back to Firebase standard auth
          await signInWithEmail(email, password);
          navigate('/');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('auth/unauthorized-domain')) {
         toast.error("This domain is not authorized in Firebase yet. Please add this URL to Authorized Domains in Firebase Console > Authentication > Settings.");
      } else {
         toast.error(err.message || 'Authentication failed. Make sure Email/Password auth is enabled in Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signIn();
      navigate('/');
    } catch (err: any) {
      if (err.message && err.message.includes('auth/unauthorized-domain')) {
         setError("This domain is not authorized in Firebase yet. Please add this URL to Authorized Domains in Firebase Console > Authentication > Settings.");
      } else {
         toast.error(err.message || 'Google Login failed');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-slate-800 border border-slate-700 rounded-2xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">{isRegister ? t('Create an Account') : t('Sign in to Hatake.Shop')}</h1>
        <p className="text-slate-400 font-medium">{t('Access the B2B Wholesale Marketplace')}</p>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-5">

        {isRegister && (
          <div>
            <label className="block text-sm font-semibold text-slate-100 mb-1.5">{t('Full Name')}</label>
            <div className="relative">
              <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full px-11 text-center"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">{t('Email Address')}</label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full px-11 text-center"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-100 mb-1.5">{t('Password')}</label>
          <div className="relative">
            <Key className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              required
              className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full px-11 text-center"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        {isRegister && (
          <div>
            <label className="block text-sm font-semibold text-slate-100 mb-1.5">{t('Company Invite Code (Optional)')}</label>
            <div className="relative">
              <Building2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Leave blank if registering as buyer"
                className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full px-11 text-center"
                value={teamCode}
                onChange={e => setTeamCode(e.target.value)}
              />
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 w-full shadow-md disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (isRegister ? <UserPlus className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />)}
          {isRegister ? 'Register' : 'Sign In'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <button 
          onClick={() => setIsRegister(!isRegister)} 
          className="text-[#ffcc00] hover:text-[#ffcc00]-hover text-sm font-semibold transition-colors"
        >
          {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
        </button>
      </div>

      <div className="mt-8 flex items-center">
        <div className="flex-1 border-t border-slate-700"></div>
        <div className="px-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">{t('or')}</div>
        <div className="flex-1 border-t border-slate-700"></div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleGoogleLogin}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all w-full"
        >
          <Chrome className="w-5 h-5 mr-2 text-slate-400" />
          Continue with Google
        </button>
      </div>

    </div>
  );
}
