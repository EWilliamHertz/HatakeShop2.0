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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="btn-ghost"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto">
          {/* Left Side - Visual/Hero */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 md:w-2/5 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 p-4">
                <img src="https://i.imgur.com/B06rBhI.png" alt="Hatake Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome to Hatake!</h2>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-sm font-medium border border-white/20 shadow-sm mt-4">
                🚀 Official Launch: October 1st
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          </div>

          {/* Right Side - Content */}
          <div className="p-8 md:w-3/5 flex flex-col justify-center bg-slate-900">
            <h3 className="text-2xl font-semibold text-white mb-4">
              The Next Generation B2B Marketplace
            </h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              We are building the most advanced platform for global trade. Discover verified suppliers, manage RFQs seamlessly, and grow your business with our market insights.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0 mr-4">
                  <Store className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Digital Storefronts</h4>
                  <p className="text-sm text-slate-400">Showcase your products to a global audience.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0 mr-4">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Smart RFQ Hub</h4>
                  <p className="text-sm text-slate-400">Streamline your sourcing and quoting process.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0 mr-4">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Verified Network</h4>
                  <p className="text-sm text-slate-400">Connect with trusted businesses worldwide.</p>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <h4 className="text-white font-medium mb-2">Are you a supplier or manufacturer?</h4>
                <p className="text-sm text-slate-400 mb-4">
                  Get a head start before our official launch. Onboard your company today and set up your digital storefront.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      handleClose();
                      navigate('/apply-seller');
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    Start Onboarding
                  </button>
                  <button
                    onClick={handleClose}
                    className="btn-secondary flex-1"
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
