import { ErrorBoundary } from './components/ErrorBoundary.tsx';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CategorySEOPage } from './pages/CategorySEOPage.tsx';
import { AuthProvider, useAuth } from './components/AuthContext.tsx';
import { WorkspaceProvider } from './components/WorkspaceContext.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { CartProvider } from './components/SampleCart.tsx';
import { CurrencyProvider } from './components/CurrencyProvider.tsx';
import { SiteModeProvider, useSiteMode } from './components/SiteModeContext.tsx';
import { ThemeProvider } from './components/ThemeContext.tsx';
import { Toaster, toast } from 'sonner';
import { Layout } from './components/Layout.tsx';
import { CookieConsent } from './components/CookieConsent.tsx';
import { Home } from './pages/Home.tsx';
import { Marketplace } from './pages/Marketplace.tsx';
import { Login } from './pages/Login.tsx';
import { JoinCompany } from './pages/JoinCompany.tsx';
import { Suppliers } from './pages/Suppliers.tsx';
import { SwedenShop } from './pages/SwedenShop.tsx';

function lazyRetry<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (
        msg.includes('is not a valid JavaScript MIME type') ||
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('error loading dynamically imported module')
      ) {
        const key = 'chunk_retry_reload_ts';
        const now = Date.now();
        const last = parseInt(sessionStorage.getItem(key) || '0', 10);
        if (now - last > 10000) {
          sessionStorage.setItem(key, String(now));
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

// --- Code-split heavy / rarely-visited pages (keeps the public bundle small) ---
const AdminDashboard = lazyRetry(() =>
  import('./pages/AdminDashboard.tsx').then((m) => ({ default: m.AdminDashboard }))
);
const DatabaseViewer = lazyRetry(() =>
  import('./pages/DatabaseViewer.tsx').then((m) => ({ default: m.DatabaseViewer }))
);
const SellerDashboard = lazyRetry(() =>
  import('./pages/SellerDashboard.tsx').then((m) => ({ default: m.SellerDashboard }))
);
const AffiliateDashboard = lazyRetry(() =>
  import('./pages/AffiliateDashboard.tsx').then((m) => ({ default: m.AffiliateDashboard }))
);
const Feed = lazyRetry(() => import('./pages/Feed.tsx').then((m) => ({ default: m.Feed })));
const Storefront = lazyRetry(() =>
  import('./pages/Storefront.tsx').then((m) => ({ default: m.Storefront }))
);
const Leads = lazyRetry(() => import('./pages/Leads.tsx').then((m) => ({ default: m.Leads })));
const Orders = lazyRetry(() => import('./pages/Orders.tsx').then((m) => ({ default: m.Orders })));
const Onboarding = lazyRetry(() =>
  import('./pages/Onboarding.tsx').then((m) => ({ default: m.Onboarding }))
);
const RFQHub = lazyRetry(() => import('./pages/RFQHub.tsx').then((m) => ({ default: m.RFQHub })));
const RFQDetails = lazyRetry(() =>
  import('./pages/RFQDetails.tsx').then((m) => ({ default: m.RFQDetails }))
);
const CompanyProfile = lazyRetry(() =>
  import('./pages/CompanyProfile.tsx').then((m) => ({ default: m.CompanyProfile }))
);
const CompanyListings = lazyRetry(() =>
  import('./pages/CompanyListings.tsx').then((m) => ({ default: m.CompanyListings }))
);
const UserProfile = lazyRetry(() =>
  import('./pages/UserProfile.tsx').then((m) => ({ default: m.UserProfile }))
);
const Settings = lazyRetry(() =>
  import('./pages/Settings.tsx').then((m) => ({ default: m.Settings }))
);
const CompanySettings = lazyRetry(() =>
  import('./pages/CompanySettings.tsx').then((m) => ({ default: m.CompanySettings }))
);
const Wishlist = lazyRetry(() =>
  import('./pages/Wishlist.tsx').then((m) => ({ default: m.Wishlist }))
);
const SellerOnboarding = lazyRetry(() =>
  import('./pages/SellerOnboarding.tsx').then((m) => ({ default: m.SellerOnboarding }))
);
const ProductPage = lazyRetry(() =>
  import('./pages/ProductPage.tsx').then((m) => ({ default: m.ProductPage }))
);

function RouteFallback() {
  const { t } = useTranslation();
  return <div className="p-8 text-center text-slate-400">{t('Loading…')}</div>;
}

function VerificationOverlay({ user }: { user: any }) {
  const { logOut } = useAuth();
  const { t } = useTranslation();
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const resendVerification = async () => {
    setSending(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api-v2/auth/send-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to send');
      setSent(true);
    } catch (e: any) {
      console.error(e);
      toast.error(t('Error sending verification email.'));
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    await user.reload();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-indigo-500"></div>

        <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-cyan-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-2">{t('Verify your email')}</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          {t("Welcome to Hatake! We've sent a verification link to")}{' '}
          <strong className="text-slate-200">{user.email}</strong>.{' '}
          {t('Please verify your email to unlock access to the marketplace and feed.')}
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-colors"
          >
            {t("I've verified my email")}
          </button>

          <button
            onClick={resendVerification}
            disabled={sending || sent}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-700"
          >
            {sending ? t('Sending...') : sent ? t('Verification Sent!') : t('Resend Verification Link')}
          </button>

          <button
            onClick={() => logOut().then(() => (window.location.href = '/login'))}
            className="w-full py-3 text-slate-500 hover:text-slate-300 font-medium text-sm transition-colors"
          >
            {t('Sign in with a different account')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPasswordGate() {
  const { adminLoginWithPassword } = useAuth();
  const { t } = useTranslation();
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await adminLoginWithPassword(password.trim());
      toast.success(t('Inloggad som administratör'));
    } catch (err: any) {
      setError(err?.message || t('Felaktigt administratörslösenord'));
      toast.error(err?.message || t('Felaktigt administratörslösenord'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xl shadow-lg">
              🔒
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                {t('Hatake Admin Panel')}
              </h1>
              <p className="text-xs text-slate-400">
                {t('Ange administratörslösenordet för att hantera hatake.shop & B2B')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t('Administratörslösenord')}
              </label>
              <input
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting ? t('Verifierar...') : t('Logga in i Admin')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  requireAdmin,
  requireSeller,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSeller?: boolean;
}) {
  const { user, dbUser, loading, isAdminPasswordSession } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  if (loading) return <div className="p-8 text-center text-slate-400">{t('Loading...')}</div>;

  if (requireAdmin) {
    const isDbAdmin = isAdminPasswordSession || dbUser?.role?.toLowerCase() === 'admin';
    if (!user || !isDbAdmin) {
      return <AdminPasswordGate />;
    }
    return children;
  }

  if (!user) return <Navigate to="/login" />;

  if (!user.emailVerified && !isAdminPasswordSession) {
    return <VerificationOverlay user={user} />;
  }

  if (dbUser && dbUser.verificationStatus === 'pending' && location.pathname !== '/settings') {
    return <Navigate to="/settings" />;
  }

  if (requireSeller) {
    const role = dbUser?.role?.toLowerCase();
    if (role !== 'seller' && role !== 'both' && role !== 'admin' && !isAdminPasswordSession) {
      return <Navigate to="/" />;
    }
  }

  return children;
}

/**
 * Renders the Flagship Swedish B2C Storefront on `hatake.shop` (`isB2C`),
 * or the B2B Wholesale Home on `b2b.hatake.shop` / `?site=b2b` (`isB2B`).
 */
function RootHomeSwitch() {
  const { isB2C } = useSiteMode();
  return isB2C ? <SwedenShop /> : <Home />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        const msg = String(error?.message || '');
        if (msg.includes('429') || msg.includes('401') || msg.includes('403') || msg.includes('404')) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster position="top-center" richColors />
        <AuthProvider>
          <WorkspaceProvider>
            <BrowserRouter>
              <SiteModeProvider>
                <CurrencyProvider>
                  <CartProvider>
                    <CookieConsent />
                    <CommandPalette />
                    <Suspense fallback={<RouteFallback />}>
                      <Routes>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<RootHomeSwitch />} />
                        <Route path="/sweden" element={<Navigate to="/" replace />} />
                        <Route path="/b2b" element={<Home />} />
                        <Route path="/b2b/marketplace" element={<Marketplace />} />
                        <Route path="/b2b/suppliers" element={<Suppliers />} />
                        <Route path="/b2b/leads" element={<Leads />} />
                        <Route path="/b2b/feed" element={<Feed />} />
                        <Route path="/b2b/onboarding" element={<Onboarding />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route path="/products/:id" element={<ProductPage />} />
                        <Route path="/product/:id" element={<ProductPage />} />
                        <Route path="/suppliers" element={<Suppliers />} />
                        <Route path="/company/:id" element={<CompanyProfile />} />
                        <Route path="/company/:id/listings" element={<CompanyListings />} />
                        <Route path="/wholesale/:categorySlug" element={<CategorySEOPage />} />
                        <Route path="/user/:id" element={<UserProfile />} />
                        <Route path="/login" element={<Login />} />
                        <Route
                          path="/wishlist"
                          element={
                            <ProtectedRoute>
                              <Wishlist />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/rfq"
                          element={
                            <ProtectedRoute>
                              <RFQHub />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/rfq/:id"
                          element={
                            <ProtectedRoute>
                              <RFQDetails />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <ProtectedRoute>
                              <ErrorBoundary>
                                <Settings />
                              </ErrorBoundary>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/seller/settings"
                          element={
                            <ProtectedRoute>
                              <ErrorBoundary>
                                <CompanySettings />
                              </ErrorBoundary>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/orders"
                          element={
                            <ProtectedRoute>
                              <ErrorBoundary>
                                <Orders />
                              </ErrorBoundary>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute requireAdmin>
                              <ErrorBoundary>
                                <AdminDashboard />
                              </ErrorBoundary>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/db"
                          element={
                            <ProtectedRoute requireAdmin>
                              <DatabaseViewer />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/affiliates"
                          element={
                            <ProtectedRoute>
                              <AffiliateDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/v/:slug" element={<Storefront />} />
                        <Route
                          path="/apply-seller"
                          element={
                            <ProtectedRoute>
                              <SellerOnboarding />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/seller"
                          element={
                            <ProtectedRoute requireSeller>
                              <ErrorBoundary>
                                <SellerDashboard />
                              </ErrorBoundary>
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/join" element={<JoinCompany />} />
                        <Route path="/leads" element={<Leads />} />
                        <Route path="/feed" element={<Feed />} />
                      </Route>
                      </Routes>
                    </Suspense>
                  </CartProvider>
                </CurrencyProvider>
              </SiteModeProvider>
            </BrowserRouter>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
