import { SellerOnboarding } from './pages/SellerOnboarding.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext.tsx';
import { CartProvider } from './components/SampleCart.tsx';
import { CurrencyProvider } from './components/CurrencyContext.tsx';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout.tsx';
import { CookieConsent } from './components/CookieConsent.tsx';
import { Home } from './pages/Home.tsx';
import { Marketplace } from './pages/Marketplace.tsx';
import { RFQHub } from './pages/RFQHub.tsx';
import { RFQDetails } from './pages/RFQDetails.tsx';
import { CompanyProfile } from './pages/CompanyProfile.tsx';
import { Settings } from './pages/Settings.tsx';
import { CompanySettings } from './pages/CompanySettings.tsx';
import { Login } from './pages/Login.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { DatabaseViewer } from './pages/DatabaseViewer.tsx';
import { AffiliateDashboard } from './pages/AffiliateDashboard.tsx';
import { Storefront } from './pages/Storefront.tsx';
import { SellerDashboard } from './pages/SellerDashboard.tsx';
import { Leads } from './pages/Leads.tsx';
import { MarketInsights } from './pages/MarketInsights.tsx';
import { JoinCompany } from "./pages/JoinCompany.tsx";
import { Orders } from './pages/Orders.tsx';
import { CookieBanner } from './components/CookieBanner.tsx';
import { Wishlist } from './pages/Wishlist.tsx';

function ProtectedRoute({ children, requireAdmin, requireSeller }: { children: React.ReactNode, requireAdmin?: boolean, requireSeller?: boolean }) {
  const { user, dbUser, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (dbUser && dbUser.verificationStatus === 'pending' && location.pathname !== '/settings') {
     return <Navigate to="/settings" />;
  }

 if (requireAdmin) {
    const isHardcodedAdmin = user.email === 'ernst@hatake.eu';
    const isDbAdmin = dbUser?.role?.toLowerCase() === 'admin';
    if (!isHardcodedAdmin && !isDbAdmin) {
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
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/company/:id" element={<CompanyProfile />} />
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
            <Route path="/insights" element={<MarketInsights />} />
          </Route>
        </Routes>
      </CartProvider>
      </CurrencyProvider>
      </BrowserRouter>
      <CookieBanner />
      </AuthProvider>
    </QueryClientProvider>
  );
}
