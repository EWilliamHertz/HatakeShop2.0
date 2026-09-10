import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FeedbackModal } from './FeedbackModal';
import { useCart } from './SampleCart.tsx';
import { Package, Search, MessageSquare, Settings, LogIn, LogOut, Hexagon, Shield, Store, Menu, X, ChevronDown, ShoppingCart, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Notifications } from './Notifications.tsx';
import { useTranslation } from 'react-i18next';
import { CurrencySelector } from './CurrencySelector.tsx';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const { user, signIn, logOut, dbUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { items: cartItems, setCartOpen } = useCart();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);

  const mainNavItems = [
    { name: 'Home', path: '/', icon: Package },
    { name: 'Marketplace', path: '/marketplace', icon: Store },
    { name: 'Messages', path: '/rfq', icon: MessageSquare, protected: true },
  ];

  const managementNavItems = [

    ...(dbUser?.role === 'seller' || dbUser?.role === 'both' || dbUser?.role === 'admin' ? [{ name: 'Supplier Portal', path: '/seller', icon: Store, protected: true }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100 selection:bg-accent/20 selection:text-[#ffcc00] font-sans">
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            
            {/* LEFT: Logo & Main Nav */}
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="relative flex flex-col justify-center h-full">
                <button 
                  onClick={() => setLogoMenuOpen(!logoMenuOpen)}
                  className="flex items-center space-x-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-accent/50 rounded-lg p-1.5 hover:bg-slate-700 transition-colors"
                >
                  <img src="/logo.png" alt="Hatake.Shop" className="h-9 w-auto" />
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 ml-1 transition-transform", logoMenuOpen ? "rotate-180" : "")} />
                </button>
                {logoMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLogoMenuOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-lg border border-slate-700 transition-all duration-200 z-50 overflow-hidden py-1">
                      <Link to="/" onClick={() => setLogoMenuOpen(false)} className="block px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-700 font-medium">{t('Home')}</Link>
                      <Link to="/marketplace" onClick={() => setLogoMenuOpen(false)} className="block px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-700 font-medium">{t('Marketplace')}</Link>
                    </div>
                  </>
                )}
              </div>
              
              {/* Desktop Main Nav */}
              <nav className="hidden md:flex space-x-2 border-l border-slate-700 pl-6 lg:pl-8">
                {mainNavItems.map((item) => {
                  if (item.protected && !user) return null;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-semibold tracking-wide flex items-center space-x-2 transition-all duration-200",
                        active 
                          ? "bg-accent/10 text-[#ffcc00]" 
                          : "text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{t(item.name)}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            
            {/* RIGHT: Portals, Notifications, Profile */}
            <div className="hidden md:flex items-center space-x-4">
              
                {dbUser?.role === 'buyer' && (
                  <Link to="/apply-seller" className="hidden md:flex px-4 py-2 bg-[#ffcc00] hover:bg-[#ffcc00]/90 text-black font-bold rounded-lg items-center gap-2 transition-colors">
                    <Store className="w-4 h-4" />
                    Become a Supplier
                  </Link>
                )}

                {user ? (
                <>
                  {/* Management Nav */}
                  {managementNavItems.length > 0 && (
                    <div className="flex items-center space-x-2 mr-2">
                      {managementNavItems.map(item => {
                         const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                         return (
                           <Link 
                              key={item.path}
                              to={item.path}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-semibold tracking-wide flex items-center space-x-2 transition-all duration-200",
                                active 
                                  ? "bg-accent text-white shadow-sm" 
                                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-100"
                              )}
                           >
                              <item.icon className="w-4 h-4" />
                              <span>{t(item.name)}</span>
                           </Link>
                         )
                      })}
                      <div className="h-8 w-px bg-hairline mx-2"></div>
                    </div>
                  )}

                  <button onClick={() => setCartOpen(true)} className="relative p-2.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-full transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                    {cartItems.length > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                    )}
                  </button>
                  <Notifications />
                  
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-full p-1 shadow-sm">
                    <Link 
                      to="/settings"
                      className="text-sm font-semibold tracking-wide text-slate-400 hover:text-slate-100 flex items-center space-x-2 px-4 py-1.5 rounded-full hover:bg-slate-700 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{dbUser?.displayName || user?.displayName || 'Settings'}</span>
                      {dbUser?.verificationStatus === 'verified' && (
                      <span title="Verified Business" className="flex items-center">
                        <Shield className="ml-1.5 w-4 h-4 text-emerald-600" />
                      </span>
                      )}
                    </Link>
                    <Link 
                      to="/orders"
                      className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-full transition-colors"
                      title={t('Order History')}
                    >
                      <Package className="w-4 h-4" />
                    </Link>
                    <div className="w-px h-5 bg-hairline mx-1"></div>
                    <button
                      onClick={logOut}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                      title={t('Sign Out')}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Business Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Simplified */}
            <div className="md:hidden flex items-center space-x-3">
               {user && <Notifications />}
               <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors">
                 {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
               </button>
            </div>
            
          </div>
        </div>
        
        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 mx-4 sm:mx-6 bg-slate-800 border border-slate-700 shadow-none rounded-2xl p-4 flex flex-col space-y-2">
            {[...mainNavItems, ...managementNavItems].map(item => {
              if (item.protected && !user) return null;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-semibold tracking-tight flex items-center space-x-3 transition-all",
                    active ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:bg-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", active ? "text-slate-100" : "text-slate-400")} />
                  <span>{t(item.name)}</span>
                </Link>
              )
            })}
            
            {user ? (
              <>
                <div className="h-px bg-slate-700 my-2"></div>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl text-sm font-semibold tracking-tight flex items-center space-x-3 text-slate-400 hover:bg-slate-900">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span>{t('Settings')}</span>
                </Link>
                <button onClick={() => { logOut(); setMobileMenuOpen(false); }} className="px-4 py-3 rounded-xl text-sm font-semibold tracking-tight flex items-center space-x-3 text-rose-600 hover:bg-rose-50 text-left">
                  <LogOut className="w-5 h-5 text-rose-400" />
                  <span>{t('Sign Out')}</span>
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="mt-2 px-4 py-3 rounded-xl text-sm font-semibold tracking-tight flex items-center justify-center space-x-2 bg-slate-900 text-surface shadow-none">
                <LogIn className="w-5 h-5" />
                <span>{t('Business Sign In')}</span>
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pt-4">
        <Outlet />
            </main>
      <footer className="mt-auto bg-slate-950 border-t border-slate-800 py-8 text-sm relative">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <div className="flex items-center justify-center md:justify-start gap-4">
            <CurrencySelector />
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-transparent text-slate-400 hover:text-white font-medium outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="sv">Svenska</option>
            </select>
          </div>

          <div className="text-center">
            <p className="font-semibold text-slate-300">&copy; {new Date().getFullYear()} Hatake.Shop. {t('All rights reserved.')}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{t('International Wholesale B2B')}</p>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <button onClick={() => setFeedbackOpen(true)} className="flex items-center space-x-2 text-slate-400 hover:text-cyan-400 font-semibold transition-colors">
              <span>{t('Report Bug / Feedback')}</span>
            </button>
          </div>
          
        </div>
      </footer>
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
