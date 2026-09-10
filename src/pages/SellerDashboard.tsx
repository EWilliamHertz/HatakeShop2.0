import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../components/CurrencyContext.tsx';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { useQuery } from '@tanstack/react-query';
import { FileText, BadgeCheck, FileBadge, PackagePlus, LayoutList, Factory, Loader2, Package, Edit2, Trash2, Upload, TrendingUp, Users, ShieldCheck, Medal, EyeOff, CheckCircle2, CreditCard, AlertCircle, Building2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { toast } from 'sonner';
import { useSearchParams, Link } from 'react-router-dom';
import Papa from 'papaparse';
import { ProductForm, ProductFormValues } from '../components/ProductForm.tsx';

import { TeamSettings } from "../components/TeamSettings.tsx";
import { cn } from "../components/Layout.tsx";

export function SellerDashboard() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { user, dbUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  
  useEffect(() => {
    if (searchParams.get('stripe_success')) {
      toast.success('Stripe account connected successfully!');
      searchParams.delete('stripe_success');
      setSearchParams(searchParams);
      setActiveTab('finance');
    } else if (searchParams.get('stripe_error')) {
      toast.error('Failed to connect Stripe account.');
      searchParams.delete('stripe_error');
      setSearchParams(searchParams);
      setActiveTab('finance');
    } else if (searchParams.get('stripe_incomplete')) {
      toast.error('Stripe onboarding incomplete.');
      searchParams.delete('stripe_incomplete');
      setSearchParams(searchParams);
      setActiveTab('finance');
    }
  }, [searchParams, setSearchParams]);
  
  const handleStripeOnboarding = async () => {
    const popup = window.open('', '_blank');
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/stripe/create-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.url && popup) {
        popup.location.href = data.url;
      } else {
        if (popup) popup.close();
        toast.error(data.error || 'Failed to start onboarding. Did you set STRIPE_SECRET_KEY?');
      }
    } catch (e) {
      if (popup) popup.close();
      toast.error('An error occurred while starting onboarding');
    }
  };
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState("listings");
  const [verificationData, setVerificationData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user && activeTab === 'verification') {
      const fetchVerification = async () => {
        try {
          const docRef = doc(db, 'seller_verifications', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setVerificationData(docSnap.data());
          } else {
            setVerificationData({ tier: 'none', status: 'unsubmitted' });
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchVerification();
    }
  }, [user, activeTab]);

  const handleVerificationSubmit = async (tier: string) => {
    setVerifying(true);
    try {
      const docRef = doc(db, 'seller_verifications', user!.uid);
      await setDoc(docRef, {
        tierRequested: tier,
        status: 'pending_review',
        updatedAt: serverTimestamp()
      }, { merge: true });
      setVerificationData(prev => ({ ...prev, tierRequested: tier, status: 'pending_review' }));
      toast.success('Verification upgrade requested! Our team will review your application.');
    } catch (err) {
      toast.error('Failed to submit request');
    } finally {
      setVerifying(false);
    }
  };


  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['sellerAnalytics'],
    queryFn: async () => {
      const res = await fetch('/api-v2/seller/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const [csvPreviewData, setCsvPreviewData] = useState<any[] | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCSV(true);
    setUploadProgress("Parsing CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvPreviewData(results.data);
        setIsUploadingCSV(false);
        setUploadProgress("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (error) => {
         toast.error('Failed to parse CSV: ' + error.message);
         setIsUploadingCSV(false);
      }
    });
  };

  const confirmUploadCSV = async () => {
    if (!csvPreviewData) return;
    setIsUploadingCSV(true);
    setUploadProgress(`Uploading ${csvPreviewData.length} items (this may take a moment to generate AI embeddings)...`);
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/seller/products/bulk', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ products: csvPreviewData })
      });
      if (res.ok) {
         const data = await res.json();
         toast.success(`Successfully uploaded ${data.length || data.count || csvPreviewData.length} items!`);
         setCsvPreviewData(null);
         fetchMyProducts();
      } else {
         const err = await res.json();
         toast.error('Upload failed: ' + err.error);
      }
    } catch(err: any) {
       toast.error('Upload failed: ' + err.message);
    } finally {
       setIsUploadingCSV(false);
       setUploadProgress("");
    }
  };
  

  useEffect(() => {
    if (user) fetchMyProducts();
  }, [user]);

  const fetchMyProducts = async () => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/seller/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  
  const maxPotentialRevenue = products.reduce((acc, p) => {
    let highestPrice = parseFloat(p.unitPrice || '0');
    if (p.tieredPricing && Array.isArray(p.tieredPricing) && p.tieredPricing.length > 0) {
      highestPrice = Math.max(highestPrice, ...p.tieredPricing.map((t: any) => parseFloat(t.price || t.unitPrice || '0')));
    }
    const qty = parseInt(p.stockQuantity || '0');
    return acc + (highestPrice * qty);
  }, 0);

  const minPotentialRevenue = products.reduce((acc, p) => {
    let lowestPrice = parseFloat(p.unitPrice || '0');
    if (p.tieredPricing && Array.isArray(p.tieredPricing) && p.tieredPricing.length > 0) {
      const prices = p.tieredPricing.map((t: any) => parseFloat(t.price || t.unitPrice || '0')).filter((v: number) => !isNaN(v) && v > 0);
      if (prices.length > 0) {
        lowestPrice = Math.min(...prices);
      }
    }
    if (lowestPrice === 0) lowestPrice = parseFloat(p.unitPrice || '0');
    const qty = parseInt(p.stockQuantity || '0');
    return acc + (lowestPrice * qty);
  }, 0);


  const handleAddSubmit = async (data: ProductFormValues) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch('/api-v2/seller/products', {
        method: 'POST',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowAddForm(false);
        
        fetchMyProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save listing");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred");
    }
  };

  const handleUpdateProduct = async (data: ProductFormValues) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      const res = await fetch(`/api-v2/seller/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchMyProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update listing");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      let token; try { token = await user?.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
      await fetch(`/api-v2/seller/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchMyProducts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 shrink-0">
        <h1 className="heading-xl mb-2">
          Supplier Portal
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Manage your wholesale catalog, track buyers, and forecast inventory.
        </p>

        <nav className="flex flex-col space-y-1">
           <button
             onClick={() => setActiveTab('listings')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'listings' ? 'bg-[var(--color-accent)] text-white shadow-sm' : 'text-slate-400 hover:bg-[var(--color-canvas)] hover:text-slate-100'}`}
           >
             <Package className={`w-5 h-5 ${activeTab === 'listings' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Listings')}</span>
           </button>
           <button
             onClick={() => setActiveTab('team')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'team' ? 'bg-[var(--color-accent)] text-white shadow-sm' : 'text-slate-400 hover:bg-[var(--color-canvas)] hover:text-slate-100'}`}
           >
             <Users className={`w-5 h-5 ${activeTab === 'team' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Team Settings')}</span>
           </button>
           <button
             onClick={() => setActiveTab('analytics')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'analytics' ? 'bg-[var(--color-accent)] text-white shadow-sm' : 'text-slate-400 hover:bg-[var(--color-canvas)] hover:text-slate-100'}`}
           >
             <TrendingUp className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Analytics')}</span>
           </button>
           <button
             onClick={() => setActiveTab('finance')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'finance' ? 'bg-[var(--color-accent)] text-white shadow-sm' : 'text-slate-400 hover:bg-[var(--color-canvas)] hover:text-slate-100'}`}
           >
             <CreditCard className={`w-5 h-5 ${activeTab === 'finance' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Finance & Payouts')}</span>
           </button>
           <button
             onClick={() => setActiveTab('verification')}
             className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'verification' ? 'bg-[var(--color-accent)] text-white shadow-sm' : 'text-slate-400 hover:bg-[var(--color-canvas)] hover:text-slate-100'}`}
           >
             <ShieldCheck className={`w-5 h-5 ${activeTab === 'verification' ? 'text-white/80' : 'text-slate-400'}`} />
             <span>{t('Verification Center')}</span>
           </button>
           <Link
             to="/seller/settings"
             className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-slate-400 hover:bg-[var(--color-canvas)] hover:text-slate-100"
           >
             <Building2 className="w-5 h-5 text-slate-400" />
             <span>{t('Company Settings')}</span>
           </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl min-h-[600px] overflow-hidden p-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 bg-[var(--color-canvas)] border-b border-[var(--color-hairline)]">
                <div>
           <div className="flex items-center gap-3">
             <h2 className="text-3xl font-extrabold text-white capitalize">{activeTab === 'listings' ? 'Product Listings' : activeTab}</h2>
             <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 border border-yellow-200 text-yellow-800 rounded-full text-xs font-semibold tracking-tight shadow-none">
               <Medal className="w-3.5 h-3.5" /> Gold Vendor
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold tracking-tight shadow-none">
               <ShieldCheck className="w-3.5 h-3.5" /> Top Exporter
             </div>
           </div>
        </div>
        
        <div className="flex items-center space-x-2">
{activeTab === 'listings' && (
             <>
               <input
                 type="file"
                 accept=".csv"
                 ref={fileInputRef}
                 className="hidden"
                 onChange={handleFileUpload}
               />
               <button
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploadingCSV}
                 className="bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl px-4 py-2 flex items-center transition-all disabled:opacity-50"
               >
                 {isUploadingCSV ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
                 {isUploadingCSV ? uploadProgress || 'Uploading...' : 'Bulk Upload'}
               </button>
               <button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 ml-2 flex items-center px-4 py-2"
               >
                 <PackagePlus className="w-5 h-5 mr-2" /> Add Listing
               </button>
             </>
           )}
        </div>
      </div>

            {activeTab === 'finance' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 p-6 md:p-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <div>
              <h2 className="heading-xl">{t('Payments & Payouts')}</h2>
              <p className="text-slate-400 mt-2 max-w-2xl text-lg">
                Get paid quickly and securely. Set up your bank account and identity verification through our partner, Stripe, to start accepting payments and receiving automatic payouts.
              </p>

              <div className="mt-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                {dbUser?.stripeOnboardingComplete ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex-1 w-full flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-emerald-900">{t('Account Verified & Active')}</h3>
                        <p className="text-emerald-700">{t('Your account is ready to receive payouts via Stripe.')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleStripeOnboarding}
                      className="px-6 py-2.5 bg-slate-800 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-semibold tracking-tight rounded-xl transition-colors shadow-none whitespace-nowrap"
                    >
                      Update Details
                    </button>
                  </div>
                ) : dbUser?.stripeAccountId ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex-1 w-full flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-amber-900">{t('Verification Pending')}</h3>
                        <p className="text-amber-700">{t('You started onboarding, but more details are needed.')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleStripeOnboarding}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold tracking-tight rounded-xl transition-colors shadow-none whitespace-nowrap"
                    >
                      Continue Onboarding
                    </button>
                  </div>
                ) : (
                   <div className="bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-xl p-6 flex-1 w-full flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                      <div className="w-12 h-12 bg-slate-700 text-[#ffcc00] rounded-full flex items-center justify-center">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-slate-100">{t('Setup Stripe Connect')}</h3>
                        <p className="text-slate-400">{t('Connect your bank account to receive funds.')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleStripeOnboarding}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2 whitespace-nowrap bg-[#635BFF] hover:bg-[#524BDE]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                      <span>{t('Connect with Stripe')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 mt-8 -mx-6 -mb-6 md:-mx-8 md:-mb-8">
               <h3 className="text-sm font-semibold tracking-tight text-slate-100 uppercase tracking-wider mb-4">{t('Payout History')}</h3>
               <div className="text-center py-12">
                  <p className="text-slate-400">{t('No payouts yet.')}</p>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'verification' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 p-6 md:p-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl relative p-8">
            <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center">
              <ShieldCheck className="w-6 h-6 mr-2 text-[var(--color-accent)]" />
              Supplier Verification Center
            </h2>
            <p className="text-slate-400 mb-8">{t('Upgrade your trust tier to unlock more buyers and higher conversion rates. Higher tiers require manual document verification.')}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Verified Tier */}
              <div className="border border-[var(--color-hairline)] rounded-xl p-6 flex flex-col hover:border-[var(--color-hairline)] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold tracking-tight text-lg flex items-center"><BadgeCheck className="w-5 h-5 mr-2 text-blue-500" />{t(' Verified')}</h3>
                  {verificationData?.tier === 'verified' && <span className="bg-blue-100 text-blue-700 text-xs font-semibold tracking-tight px-2 py-1 rounded-full">{t('Current')}</span>}
                </div>
                <p className="text-sm text-slate-400 flex-1 mb-6">{t('Basic business verification. Requires business license and identity check.')}</p>
                <button 
                  onClick={() => handleVerificationSubmit('verified')}
                  disabled={verifying || verificationData?.tier === 'verified' || verificationData?.status === 'pending_review'}
                  className="w-full py-2 bg-blue-50 text-blue-600 font-semibold tracking-tight rounded-xl hover:bg-blue-100 disabled:opacity-50"
                >
                  {verificationData?.tierRequested === 'verified' && verificationData?.status === 'pending_review' ? 'Pending Review' : 'Apply for Verified'}
                </button>
              </div>

              {/* Gold Tier */}
              <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="w-16 h-16 text-amber-500" /></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="font-semibold tracking-tight text-lg flex items-center text-amber-700"><FileBadge className="w-5 h-5 mr-2 text-amber-500" />{t(' Gold Supplier')}</h3>
                  {verificationData?.tier === 'gold' && <span className="bg-amber-100 text-amber-800 text-xs font-semibold tracking-tight px-2 py-1 rounded-full">{t('Current')}</span>}
                </div>
                <p className="text-sm text-slate-400 flex-1 mb-6 relative z-10">{t('Premium status. Requires ISO certification and advanced business history.')}</p>
                <button 
                  onClick={() => handleVerificationSubmit('gold')}
                  disabled={verifying || verificationData?.tier === 'gold' || verificationData?.status === 'pending_review'}
                  className="w-full py-2 bg-amber-500 text-white font-semibold tracking-tight rounded-xl hover:bg-amber-600 disabled:opacity-50 relative z-10 shadow-none"
                >
                  {verificationData?.tierRequested === 'gold' && verificationData?.status === 'pending_review' ? 'Pending Review' : 'Apply for Gold'}
                </button>
              </div>

              {/* Audited Tier */}
              <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-6 flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="font-semibold tracking-tight text-lg flex items-center text-emerald-700"><ShieldCheck className="w-5 h-5 mr-2 text-emerald-500" />{t(' Audited')}</h3>
                  {verificationData?.tier === 'audited' && <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold tracking-tight px-2 py-1 rounded-full">{t('Current')}</span>}
                </div>
                <p className="text-sm text-slate-400 flex-1 mb-6 relative z-10">{t('Highest trust level. Requires on-site factory inspection reports.')}</p>
                <button 
                  onClick={() => handleVerificationSubmit('audited')}
                  disabled={verifying || verificationData?.tier === 'audited' || verificationData?.status === 'pending_review'}
                  className="w-full py-2 bg-emerald-600 text-white font-semibold tracking-tight rounded-xl hover:bg-emerald-700 disabled:opacity-50 relative z-10 shadow-none"
                >
                  {verificationData?.tierRequested === 'audited' && verificationData?.status === 'pending_review' ? 'Pending Review' : 'Apply for Audited'}
                </button>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-[var(--color-hairline)]">
              <h3 className="font-semibold tracking-tight text-slate-100 mb-4">{t('Document Uploads')}</h3>
              <p className="text-sm text-slate-400 mb-4">{t('Please upload your business license, ISO certificates, or factory inspection reports here. Our administrative team will review them against your application.')}</p>
              <div className="p-4 border-2 border-dashed border-[var(--color-hairline)] rounded-xl text-center flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-400">{t('Drag & drop files or click to browse')}</span>
                <input type="file" className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 mt-4 max-w-sm mx-auto" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 p-6 md:p-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-center items-center">
                 <div className="text-sm font-semibold tracking-tight text-slate-400 uppercase tracking-wider mb-2">{t('Total Revenue')}</div>
                 <div className="text-4xl font-black text-emerald-600">€{(analyticsData?.totalRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                 <div className="text-xs text-slate-400 mt-2 text-center">{t('Actual revenue from completed orders')}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-center items-center">
                 <div className="text-sm font-semibold tracking-tight text-slate-400 uppercase tracking-wider mb-2">{t('Profile Views')}</div>
                 <div className="text-4xl font-black text-[var(--color-accent)]">{analyticsData?.profileViews || 0}</div>
                 <div className="text-xs text-slate-400 mt-2 text-center">{t('In the last 30 days')}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-center items-center">
                 <div className="text-sm font-semibold tracking-tight text-slate-400 uppercase tracking-wider mb-2">{t('Conversion Rate')}</div>
                 <div className="text-4xl font-black text-amber-600">{analyticsData?.conversionRate?.toFixed(1) || '0.0'}%</div>
                 <div className="text-xs text-slate-400 mt-2 text-center">{t('Inquiries to accepted orders')}</div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                 <h3 className="text-2xl font-bold text-white mb-6">Profile Views & Inquiries (30 Days)</h3>
                 <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData?.lineChartData || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                        <Line yAxisId="left" type="monotone" dataKey="views" name="Profile Views" stroke="#6366f1" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                        <Line yAxisId="right" type="monotone" dataKey="inquiries" name="New Inquiries" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-white mb-6 self-start">Sales Funnel (All Time)</h3>
                    <div className="h-72 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={analyticsData?.funnelData || []}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={100}
                             paddingAngle={5}
                             dataKey="value"
                             label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                             labelLine={false}
                           >
                             {(analyticsData?.funnelData || []).map((entry: any, index: number) => (
                               <Cell key={`cell-${index}`} fill={entry.fill} />
                             ))}
                           </Pie>
                           <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-2xl font-bold text-white mb-6">{t('Top Selling Value by Category')}</h3>
                    <div className="h-72">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={analyticsData?.barChartData || []}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                           <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
                           <Bar dataKey="revenue" name="Total Value (€)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'team' ? (
        <TeamSettings />


      ) : (
        <>
          {showAddForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 m-6 md:mx-8">
           <h2 className="text-3xl font-extrabold text-white mb-4">{t('Create New Wholesale Listing')}</h2>
           
           <ProductForm onSubmit={handleAddSubmit} onCancel={() => setShowAddForm(false)} submitLabel="Publish Listing" />

        </div>
      )}
      
      {activeTab === 'listings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2 animate-in fade-in slide-in-from-bottom-2 p-6 md:px-8">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
             <div className="text-sm text-slate-400 font-medium mb-1">{t('Max Potential Revenue')}</div>
             <div className="text-3xl font-black text-emerald-600">{formatPrice(maxPotentialRevenue)}</div>
             <div className="text-xs text-slate-400 mt-2">{t('Potential revenue if all stock is sold at the highest possible sale price (lowest volume tier).')}</div>
           </div>
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
             <div className="text-sm text-slate-400 font-medium mb-1">{t('Min Potential Revenue')}</div>
             <div className="text-3xl font-black text-[var(--color-accent)]">{formatPrice(minPotentialRevenue)}</div>
             <div className="text-xs text-slate-400 mt-2">{t('Potential revenue if all stock is sold at the lowest possible sale price (highest volume tier).')}</div>
           </div>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden mx-6 md:mx-8 mb-8 p-0">
         <div className="bg-[var(--color-canvas)] p-4 border-b border-[var(--color-hairline)] font-semibold tracking-tight text-slate-100 flex items-center">
            <LayoutList className="w-5 h-5 mr-2 text-slate-400" />
            My Active Listings
         </div>
         <div className="divide-y divide-slate-100">
            {products.length === 0 ? (
               <div className="p-8 text-center text-slate-400">You haven't listed any products yet.</div>
            ) : (
               (Array.isArray(products) ? products : []).map((product) => (
                  <div key={product.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:bg-[var(--color-canvas)] transition-colors">
                     {product.images?.[0] ? (
                       <img src={product.images[0]} alt={product.title} className="w-full sm:w-32 h-32 object-cover rounded-xl border border-[var(--color-hairline)]" />
                     ) : (
                       <div className="w-full sm:w-32 h-32 bg-slate-700 rounded-xl border border-[var(--color-hairline)] flex items-center justify-center">
                          <Package className="w-8 h-8 text-slate-400" />
                       </div>
                     )}
                     <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold tracking-tight text-slate-100">{product.title}</h3>
                          {product.approvalStatus === 'pending' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] uppercase font-semibold tracking-tight rounded-full">{t('Pending Review')}</span>}
                          {product.approvalStatus === 'rejected' && <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] uppercase font-semibold tracking-tight rounded-full">{t('Rejected')}</span>}
                        </div>
                        <div className="text-sm text-slate-400 mt-1 line-clamp-2">{product.description}</div>
                        
                         <div className="flex flex-wrap gap-2 mt-3">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-none">
                              Stock: {product.stockQuantity || 0}
                           </span>
                           {product.stockQuantity <= Math.max(5, product.moq) && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-tight bg-rose-100 text-rose-800 border border-rose-200 shadow-none animate-pulse">
                                ⚠️ Low Stock
                              </span>
                           )}
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-100">
                              MOQ: {product.moq}
                           </span>
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400">
                              {product.originType}
                           </span>
                        </div>
                        <div className="mt-2 text-xs font-medium text-slate-400">
                           Est. Total Stock Value: <span className="font-semibold tracking-tight text-slate-400">€{(parseFloat(product.unitCost) * parseInt(product.stockQuantity || 0)).toLocaleString()}</span>
                        </div>

                     </div>
                     <div className="flex items-start space-x-2">
                        <button onClick={() => setEditingProduct(product)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all p-2 shadow-sm rounded-lg">
                           <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all p-2 shadow-sm rounded-lg hover:text-red-600 hover:border-red-200">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
        </>
      )}
      {csvPreviewData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCsvPreviewData(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col p-0" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--color-hairline)] flex justify-between items-center bg-[var(--color-canvas)] shrink-0">
              <h3 className="text-2xl font-bold text-white">Preview CSV Upload</h3>
              <button onClick={() => setCsvPreviewData(null)} className="text-slate-400 hover:text-slate-400 font-semibold tracking-tight">✕</button>
            </div>
            <div className="p-6 overflow-x-auto overflow-y-auto flex-1 bg-[var(--color-surface)]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {csvPreviewData.length > 0 && Object.keys(csvPreviewData[0]).map((key) => (
                      <th key={key} className="p-2 border-b border-[var(--color-hairline)] text-slate-300 font-semibold">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewData.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="p-2 border-b border-[var(--color-hairline)] text-slate-400 text-sm whitespace-nowrap">{val}</td>
                      ))}
                    </tr>
                  ))}
                  {csvPreviewData.length > 5 && (
                    <tr>
                      <td colSpan={Object.keys(csvPreviewData[0] || {}).length} className="p-2 text-center text-slate-500 italic text-sm">
                        ...and {csvPreviewData.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] flex justify-end gap-3 shrink-0">
               <button onClick={() => setCsvPreviewData(null)} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-xl hover:bg-slate-600 transition-colors">Cancel</button>
               <button onClick={confirmUploadCSV} disabled={isUploadingCSV} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors flex items-center">
                 {isUploadingCSV ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                 {isUploadingCSV ? 'Uploading...' : 'Confirm Upload'}
               </button>
            </div>
          </div>
        </div>
      )}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingProduct(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col p-0" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--color-hairline)] flex justify-between items-center bg-[var(--color-canvas)] shrink-0">
              <h3 className="text-2xl font-bold text-white">{t('Edit Listing')}</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-400 font-semibold tracking-tight">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-[var(--color-surface)]">
              
              <ProductForm 
                  initialValues={editingProduct} 
                  onSubmit={handleUpdateProduct} 
                  onCancel={() => setEditingProduct(null)} 
                  submitLabel="Save Changes"
                 />
            </div>
          </div>
        </div>
      )}
    </div>
      </div>
    </div>
  );
}
