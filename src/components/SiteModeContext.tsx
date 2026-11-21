import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import i18n, { resolveLanguageForMode } from '../i18n.ts';

export type SiteMode = 'b2c' | 'b2b';

interface SiteModeContextType {
  siteMode: SiteMode;
  isB2C: boolean;
  isB2B: boolean;
  setSiteMode: (mode: SiteMode) => void;
  switchSiteMode: (targetMode: SiteMode, targetPath?: string) => void;
  b2bHref: string;
  b2cHref: string;
}

const STORAGE_KEY = 'hatake_site_mode';

export function detectInitialSiteMode(): SiteMode {
  if (typeof window === 'undefined') return 'b2c';

  const hostname = window.location.hostname.toLowerCase();
  const port = window.location.port;
  const params = new URLSearchParams(window.location.search);
  const siteParam = params.get('site')?.toLowerCase();

  // 1. Explicit query param override (?site=b2b or ?site=b2c)
  if (siteParam === 'b2b' || siteParam === 'b2c') {
    try {
      sessionStorage.setItem(STORAGE_KEY, siteParam);
    } catch {}
    return siteParam;
  }

  // 2. Subdomain check (b2b.hatake.shop / b2b.localhost) or dedicated B2B local port 3001
  if (hostname.startsWith('b2b.') || port === '3001') {
    return 'b2b';
  }

  // 3. Path prefix check: /b2b or /b2b/*
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === '/b2b' || pathname.startsWith('/b2b/')) {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'b2b');
    } catch {}
    return 'b2b';
  }
  if (pathname === '/sweden' || pathname.startsWith('/sweden/')) {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'b2c');
    } catch {}
    return 'b2c';
  }

  // 4. B2B-exclusive routes automatically activate B2B mode when visited directly
  const b2bExclusivePrefixes = [
    '/marketplace',
    '/suppliers',
    '/rfq',
    '/leads',
    '/feed',
    '/onboarding',
    '/affiliates',
    '/seller',
    '/apply-seller',
    '/company/',
    '/wholesale/',
    '/join',
  ];
  if (b2bExclusivePrefixes.some((p) => pathname === p || pathname.startsWith(p))) {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'b2b');
    } catch {}
    return 'b2b';
  }

  // 5. On plain localhost:3000 / hatake.shop root '/', default to B2C
  if (pathname === '/') {
    return 'b2c';
  }

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved === 'b2b' || saved === 'b2c') {
      return saved;
    }
  } catch {}

  return 'b2c';
}

const SiteModeContext = createContext<SiteModeContextType>({
  siteMode: 'b2c',
  isB2C: true,
  isB2B: false,
  setSiteMode: () => {},
  switchSiteMode: () => {},
  b2bHref: '/b2b',
  b2cHref: '/?site=b2c',
});

export const useSiteMode = () => useContext(SiteModeContext);

export const SiteModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteMode, setSiteModeState] = useState<SiteMode>(() => detectInitialSiteMode());
  const location = useLocation();
  const navigate = useNavigate();

  const setSiteMode = useCallback((mode: SiteMode) => {
    setSiteModeState(mode);
    try {
      sessionStorage.setItem(STORAGE_KEY, mode);
      const targetLang = resolveLanguageForMode(mode);
      if (i18n.language !== targetLang) {
        i18n.changeLanguage(targetLang);
        document.documentElement.lang = targetLang;
      }
    } catch {}
  }, []);

  // Ensure initial language matches active siteMode (English on B2B, Swedish on B2C)
  useEffect(() => {
    const targetLang = resolveLanguageForMode(siteMode);
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
      document.documentElement.lang = targetLang;
    }
  }, [siteMode]);

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    const port = window.location.port;
    const params = new URLSearchParams(location.search);
    const siteParam = params.get('site')?.toLowerCase();
    const pathname = location.pathname.toLowerCase();

    if (pathname === '/sweden' || pathname.startsWith('/sweden/')) {
      setSiteMode('b2c');
      navigate('/', { replace: true });
      return;
    }

    if (siteParam === 'b2b') {
      if (siteMode !== 'b2b') setSiteMode('b2b');
      return;
    }
    if (siteParam === 'b2c') {
      if (siteMode !== 'b2c') setSiteMode('b2c');
      return;
    }

    if (pathname === '/b2b' || pathname.startsWith('/b2b/')) {
      if (siteMode !== 'b2b') setSiteMode('b2b');
      return;
    }

    const b2bExclusivePrefixes = [
      '/marketplace',
      '/suppliers',
      '/rfq',
      '/leads',
      '/feed',
      '/onboarding',
      '/affiliates',
      '/seller',
      '/apply-seller',
      '/company/',
      '/wholesale/',
      '/join',
    ];
    if (b2bExclusivePrefixes.some((p) => pathname === p || pathname.startsWith(p))) {
      if (siteMode !== 'b2b') setSiteMode('b2b');
      return;
    }

    if (hostname.startsWith('b2b.') || port === '3001') {
      if (siteMode !== 'b2b') setSiteMode('b2b');
      return;
    }

    if (pathname === '/') {
      if (siteMode !== 'b2c') setSiteMode('b2c');
    }
  }, [location.pathname, location.search, siteMode, setSiteMode, navigate]);

  const isProductionHatakeDomain =
    typeof window !== 'undefined' &&
    (window.location.hostname.toLowerCase() === 'hatake.shop' ||
      window.location.hostname.toLowerCase() === 'www.hatake.shop' ||
      window.location.hostname.toLowerCase() === 'b2b.hatake.shop');

  // In local dev / preview, stay on the current reachable host (/b2b and /) so clicking never fails DNS resolution
  const b2bHref = isProductionHatakeDomain ? 'https://b2b.hatake.shop' : '/b2b';
  const b2cHref = isProductionHatakeDomain ? 'https://hatake.shop' : '/?site=b2c';

  const switchSiteMode = useCallback(
    (targetMode: SiteMode, targetPath?: string) => {
      setSiteMode(targetMode);
      const currentHost = window.location.hostname.toLowerCase();

      if (isProductionHatakeDomain) {
        if (targetMode === 'b2b' && !currentHost.startsWith('b2b.')) {
          window.location.href = `https://b2b.hatake.shop${targetPath || '/'}`;
          return;
        }
        if (targetMode === 'b2c' && currentHost.startsWith('b2b.')) {
          window.location.href = `https://hatake.shop${targetPath || '/'}`;
          return;
        }
      }

      if (targetMode === 'b2b') {
        navigate(targetPath || '/b2b');
      } else {
        if (currentHost.startsWith('b2b.') || window.location.port === '3001') {
          navigate(targetPath || '/?site=b2c');
        } else {
          navigate(targetPath || '/');
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isProductionHatakeDomain, navigate, setSiteMode]
  );

  return (
    <SiteModeContext.Provider
      value={{
        siteMode,
        isB2C: siteMode === 'b2c',
        isB2B: siteMode === 'b2b',
        setSiteMode,
        switchSiteMode,
        b2bHref,
        b2cHref,
      }}
    >
      {children}
    </SiteModeContext.Provider>
  );
};
