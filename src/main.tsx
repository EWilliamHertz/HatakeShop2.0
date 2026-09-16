import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import { CurrencyProvider } from './components/CurrencyProvider.tsx';

import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// UNREGISTER ANY ROGUE SERVICE WORKERS THAT MIGHT BE CACHING OLD CRASHING CODE
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
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

