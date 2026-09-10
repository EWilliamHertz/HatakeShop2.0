import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold tracking-tight text-white shadow-none hover:bg-ink-light transition-colors"
      >
        <Download className="w-4 h-4" />
        {isIOS ? 'Install on iOS' : 'Install App'}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-2xl relative">
            <h3 className="text-lg font-semibold tracking-tight text-slate-100 mb-2">Install App</h3>
            {isIOS ? (
              <p className="mt-2 text-sm text-slate-400 mb-6">
                1. Open this page in Safari.<br /><br />
                2. Tap the <strong>Share</strong> button in the toolbar.<br /><br />
                3. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400 mb-6">
                To install this app, you may need to open it in a new tab directly (outside of this preview). Look for the install icon in your browser's address bar or menu.
              </p>
            )}
            <button
              onClick={() => setShowGuide(false)}
              className="w-full rounded-xl bg-slate-700 py-3 text-sm font-semibold tracking-tight text-slate-100 hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
