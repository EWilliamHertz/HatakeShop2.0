import { ErrorBoundary } from './components/ErrorBoundary.tsx';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext.tsx';
import { CartProvider } from './components/SampleCart.tsx';
import { CurrencyProvider } from './components/CurrencyProvider.tsx';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout.tsx';
import { CookieConsent } from './components/CookieConsent.tsx';
import { Home } from './pages/Home.tsx';
import { Onboarding } from './pages/Onboarding.tsx';
import { Marketplace } from './pages/Marketplace.tsx';
import { RFQHub } from './pages/RFQHub.tsx';
import { RFQDetails } from './pages/RFQDetails.tsx';
import { CompanyProfile } from './pages/CompanyProfile.tsx';
import { CompanyListings } from './pages/CompanyListings.tsx';
import { UserProfile } from './pages/UserProfile.tsx';
import { Settings } from './pages/Settings.tsx';
import { CompanySettings } from './pages/CompanySettings.tsx';
import { Login } from './pages/Login.tsx';
import { JoinCompany } from "./pages/JoinCompany.tsx";
import { Suppliers } from './pages/Suppliers.tsx';

// --- Code-split heavy / rarely-visited pages (keeps the public bundle small) ---
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.tsx').then(m => ({ default: m.AdminDashboard })));
const DatabaseViewer = lazy(() => import('./pages/DatabaseViewer.tsx').then(m => ({ default: m.DatabaseViewer })));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard.tsx').then(m => ({ default: m.SellerDashboard })));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard.tsx').then(m => ({ default: m.AffiliateDashboard })));
const Feed = lazy(() => import('./pages/Feed.tsx').then(m => ({ default: m.Feed })));
const Storefront = lazy(() => import('./pages/Storefront.tsx').then(m => ({ default: m.Storefront })));
const Leads = lazy(() => import('./pages/Leads.tsx').then(m => ({ default: m.Leads })));
const MarketInsights = lazy(() => import('./pages/MarketInsights.tsx').then(m => ({ default: m.MarketInsights })));
const Orders = lazy(() => import('./pages/Orders.tsx').then(m => ({ default: m.Orders })));
const RFQDetailsLazy = RFQDetails;
const Wishlist = lazy(() => import('./pages/Wishlist.tsx').then(m => ({ default: m.Wishlist })));
const SellerOnboarding = lazy(() => import('./pages/SellerOnboarding.tsx').then(m => ({ default: m.SellerOnboarding })));
const ProductPage = lazy(() => import('./pages/ProductPage.tsx').then(m => ({ default: m.ProductPage })));

function RouteFallback() {
  return <div className="p-8 text-center text-slate-400">Loading…</div>;
}


function VerificationOverlay({ user }: { user: any }) {
  const { logOut } = useAuth();
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const resendVerification = async () => {
     setSending(true);
     try {
       const token = await user.getIdToken();
       const res = await fetch('/api-v2/auth/send-verification', {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}` }
       });
       if (!res.ok) throw new Error('Failed to send');
       setSent(true);
     } catch (e: any) {
       console.error(e);
       alert("Error sending verification email.");
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
             <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>
          
          <h2 className="text-2xl font-extrabold text-white mb-2">Verify your email</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Welcome to Hatake B2B! We've sent a verification link to <strong className="text-slate-200">{user.email}</strong>. Please verify your email to unlock access to the marketplace and feed.
          </p>

          <div className="space-y-3">
             <button onClick={handleRefresh} className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-colors">
               I've verified my email
             </button>
             
             <button onClick={resendVerification} disabled={sending || sent} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-700">
               {sending ? 'Sending...' : sent ? 'Verification Sent!' : 'Resend Verification Link'}
             </button>
             
             <button onClick={() => logOut().then(() => window.location.href='/login')} className="w-full py-3 text-slate-500 hover:text-slate-300 font-medium text-sm transition-colors">
               Sign in with a different account
             </button>
          </div>
       </div>
    </div>
  );
}

function ProtectedRoute({ children, requireAdmin, requireSeller }: { children: React.ReactNode, requireAdmin?: boolean, requireSeller?: boolean }) {
  const { user, dbUser, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (!user.emailVerified) {
     return <VerificationOverlay user={user} />;
  }

  if (dbUser && dbUser.verificationStatus === 'pending' && location.pathname !== '/settings') {
     return <Navigate to="/settings" />;
  }

 if (requireAdmin) {
    // DB role is the single source of truth for admin access
    const isDbAdmin = dbUser?.role?.toLowerCase() === 'admin';
    if (!isDbAdmin) {
      return <Navigate to="/" />;
    }
  }

  if (requireSeller) {
    const role = dbUser?.role?.toLowerCase();
    if (role !== 'seller' && role !== 'both' && role !== 'admin') {
      return <Navigate to="/" />;
    }
  }

  return children;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <Toaster position="top-center" richColors />
    <AuthProvider>
      <BrowserRouter>
      <CurrencyProvider>
      <CartProvider>
        <CookieConsent />
                <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/products/:id" element={<ProductPage />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/company/:id" element={<CompanyProfile />} />
            <Route path="/company/:id/listings" element={<CompanyListings />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/rfq" element={<ProtectedRoute><RFQHub /></ProtectedRoute>} />
            <Route path="/rfq/:id" element={<ProtectedRoute><RFQDetails /></ProtectedRoute>} />
            <Route path="/settings" element={
            <ProtectedRoute>
              <ErrorBoundary><Settings /></ErrorBoundary>
            </ProtectedRoute>
          } />
            <Route path="/seller/settings" element={
            <ProtectedRoute>
              <ErrorBoundary><CompanySettings /></ErrorBoundary>
            </ProtectedRoute>
          } />
            <Route path="/orders" element={
            <ProtectedRoute>
              <ErrorBoundary><Orders /></ErrorBoundary>
            </ProtectedRoute>
          } />
            <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <ErrorBoundary><AdminDashboard /></ErrorBoundary>
            </ProtectedRoute>
          } />
            <Route path="/admin/db" element={<ProtectedRoute requireAdmin><DatabaseViewer /></ProtectedRoute>} />
            <Route path="/affiliates" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
            <Route path="/v/:slug" element={<Storefront />} />
            <Route path="/apply-seller" element={<ProtectedRoute><SellerOnboarding /></ProtectedRoute>} />
            <Route path="/seller" element={
            <ProtectedRoute requireSeller>
              <ErrorBoundary><SellerDashboard /></ErrorBoundary>
            </ProtectedRoute>
          } />
            <Route path="/join" element={<JoinCompany />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/insights" element={<MarketInsights />} />
          </Route>
        </Routes>
        </Suspense>
      </CartProvider>
      </CurrencyProvider>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  );
}
