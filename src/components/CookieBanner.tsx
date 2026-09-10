import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function CookieBanner() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-300">
          {t('We use cookies to improve your experience, analyze traffic, and personalize content. By clicking "Accept", you consent to our use of cookies.')}
        </div>
        <div className="flex gap-3 shrink-0">
          <button 
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {t('Decline')}
          </button>
          <button 
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-semibold text-black bg-[#ffcc00] hover:bg-[#ffcc00]/90 rounded-lg transition-colors"
          >
            {t('Accept All')}
          </button>
        </div>
      </div>
    </div>
  );
}
