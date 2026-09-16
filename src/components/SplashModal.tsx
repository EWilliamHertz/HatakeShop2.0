import React, { useState, useEffect } from 'react';
import { X, Rocket, CheckCircle2, TrendingUp, Building2, Store } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export function SplashModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    const modalKey = 'hatake_splash_seen';
    
    // For anonymous users
    if (!user) {
      const anonSeen = localStorage.getItem(`${modalKey}_anon`);
      if (!anonSeen) {
        setIsOpen(true);
      }
      return;
    }

    // For logged-in users
    if (user) {
      // Use uid or fallback to email to guarantee uniqueness
      const accountId = user.uid || user.email || 'unknown';
      const userSeenKey = `${modalKey}_${accountId}`;
      const hasSeen = localStorage.getItem(userSeenKey);
      
      if (!hasSeen) {
        setIsOpen(true);
      }
    }
  }, [user, loading]);

  const handleClose = () => {
    setIsOpen(false);
    const modalKey = 'hatake_splash_seen';
    if (user) {
      const accountId = user.uid || user.email || 'unknown';
      localStorage.setItem(`${modalKey}_${accountId}`, 'true');
    } else {
      localStorage.setItem(`${modalKey}_anon`, 'true');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-all flex items-center justify-center bg-slate-900/50 backdrop-blur-md border border-slate-700/50"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto">
          {/* Left Side - Visual/Hero */}
          <div className="bg-gradient-to-br from-cyan-600 via-indigo-600 to-purple-700 p-10 md:p-16 md:w-2/5 flex flex-col justify-center relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex items-center justify-center mb-8 p-6 transform hover:scale-105 transition-transform duration-500">
                <img src="https://i.imgur.com/B06rBhI.png" alt="Hatake Logo" className="w-full h-full object-contain filter drop-shadow-lg" />
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">Welcome to Hatake!</h2>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white font-semibold border border-white/30 shadow-lg mt-2">
                🚀 Official Launch: October 1st
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl"></div>
          </div>

          {/* Right Side - Content */}
          <div className="p-8 md:p-12 lg:p-16 md:w-3/5 flex flex-col justify-center bg-slate-900">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">
              The Next Generation B2B Marketplace
            </h3>
            <p className="text-slate-300 mb-10 text-lg md:text-xl leading-relaxed">
              We are building the most advanced platform for global trade. Discover verified suppliers, manage RFQs seamlessly, and grow your business with our market insights.
            </p>

            <div className="space-y-6 mb-12">
              <div className="flex items-start">
                <div className="p-3 bg-indigo-500/10 rounded-xl shrink-0 mr-5 border border-indigo-500/20 shadow-inner">
                  <Store className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg">Digital Storefronts</h4>
                  <p className="text-slate-400">Showcase your products to a global audience.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="p-3 bg-emerald-500/10 rounded-xl shrink-0 mr-5 border border-emerald-500/20 shadow-inner">
                  <TrendingUp className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg">Smart RFQ Hub</h4>
                  <p className="text-slate-400">Streamline your sourcing and quoting process.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="p-3 bg-cyan-500/10 rounded-xl shrink-0 mr-5 border border-cyan-500/20 shadow-inner">
                  <Building2 className="w-7 h-7 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg">Verified Network</h4>
                  <p className="text-slate-400">Connect with trusted businesses worldwide.</p>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl">
                <h4 className="text-white font-bold text-xl mb-2">Are you a supplier or manufacturer?</h4>
                <p className="text-slate-400 mb-6">
                  Get a head start before our official launch. Onboard your company today and set up your digital storefront.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => {
                      handleClose();
                      navigate('/apply-seller');
                    }}
                    className="btn-primary flex-1 py-3.5 text-lg"
                  >
                    Start Onboarding
                  </button>
                  <button
                    onClick={handleClose}
                    className="btn-secondary flex-1 py-3.5 text-lg"
                  >
                    Explore Platform
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 z-[-1]" onClick={handleClose}></div>
    </div>
  );
}
