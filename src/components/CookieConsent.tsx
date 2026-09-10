import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({ necessary: true, analytics: true, marketing: true }));
    setShow(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie_consent', JSON.stringify(preferences));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none flex justify-center">
      <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 max-w-4xl w-full pointer-events-auto flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold tracking-tight text-slate-100 text-lg">We value your privacy</h3>
          <p className="text-sm text-slate-400">
            We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. 
            We comply with EU GDPR and Swedish legislation. 
            By clicking "Accept All", you consent to our use of cookies and IP address collection for security purposes.
          </p>
        </div>
        
        {showSettings ? (
          <div className="w-full md:w-auto flex flex-col gap-3 min-w-[250px] bg-slate-900 p-4 rounded-xl border border-slate-700">
             <label className="flex items-center justify-between gap-4 cursor-not-allowed opacity-70">
                <span className="text-sm font-medium text-slate-100">Necessary (Required)</span>
                <input type="checkbox" checked disabled className="w-4 h-4 text-[#ffcc00] rounded" />
             </label>
             <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm font-medium text-slate-100">Analytics</span>
                <input type="checkbox" checked={preferences.analytics} onChange={e => setPreferences({...preferences, analytics: e.target.checked})} className="w-4 h-4 text-[#ffcc00] rounded border-slate-700 focus:ring-ink" />
             </label>
             <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm font-medium text-slate-100">Marketing</span>
                <input type="checkbox" checked={preferences.marketing} onChange={e => setPreferences({...preferences, marketing: e.target.checked})} className="w-4 h-4 text-[#ffcc00] rounded border-slate-700 focus:ring-ink" />
             </label>
             <button onClick={handleSavePreferences} className="mt-2 w-full py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold tracking-tight hover:bg-slate-800 transition-colors">
                Save Preferences
             </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowSettings(true)}
              className="px-6 py-2.5 text-sm font-semibold tracking-tight text-slate-400 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors whitespace-nowrap"
            >
              Manage Preferences
            </button>
            <button 
              onClick={handleAcceptAll}
              className="px-6 py-2.5 text-sm font-semibold tracking-tight text-white bg-ink rounded-xl hover:bg-ink-light transition-colors shadow-none whitespace-nowrap"
            >
              Accept All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
