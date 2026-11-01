import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import { CurrencyProvider } from './components/CurrencyProvider.tsx';

import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Auto-recover when a new build is deployed and older chunk hashes are requested
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Stale chunk detected after deployment, refreshing...', event);
  const key = 'vite_chunk_reload_ts';
  const now = Date.now();
  const last = parseInt(sessionStorage.getItem(key) || '0', 10);
  if (now - last > 10000) {
    sessionStorage.setItem(key, String(now));
    window.location.reload();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration);
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);

