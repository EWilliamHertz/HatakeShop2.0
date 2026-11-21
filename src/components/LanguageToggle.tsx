import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteMode } from './SiteModeContext.tsx';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const { isB2B } = useSiteMode();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'sv';

  const setLanguage = (lang: 'sv' | 'en') => {
    i18n.changeLanguage(lang);
    try {
      const modeKey = isB2B ? 'hatake_lang_b2b' : 'hatake_lang_b2c';
      localStorage.setItem(modeKey, lang);
      localStorage.setItem('i18nextLng', lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  return (
    <div
      role="group"
      aria-label={t('Language Switcher')}
      className={`inline-flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-0.5 text-xs font-bold shrink-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage('sv')}
        aria-pressed={currentLang === 'sv'}
        title="Svenska (SV)"
        aria-label="Svenska"
        className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
          currentLang === 'sv'
            ? 'bg-cyan-500 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span>🇸🇪</span>
        <span>SV</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={currentLang === 'en'}
        title="English (EN)"
        aria-label="English"
        className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
          currentLang === 'en'
            ? 'bg-cyan-500 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
