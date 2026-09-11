import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import { CurrencyProvider } from './components/CurrencyContext.tsx';

import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary.tsx';

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

