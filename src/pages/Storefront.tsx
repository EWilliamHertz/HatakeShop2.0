import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { MapPin, ShieldCheck, Box, Info } from 'lucide-react';
import { VendorReviews } from '../components/VendorReviews.tsx';

export function Storefront() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetch(`/api-v2/store/${slug}`);
        if (res.ok) {
          setStoreData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [slug]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading storefront...</div>;
  if (!storeData?.store) return <div className="p-12 text-center text-slate-400 font-medium">Store not found.</div>;

  const { store, products } = storeData;

  return (
    <div className="bg-slate-900 min-h-screen -mt-4 pb-12">
      <Helmet>
        <title>{store.companyName || 'Store'} | Hatake</title>
        <meta name="description" content={`Shop products from ${store.companyName} on Hatake Marketplace.`} />
      </Helmet>
      {/* Banner */}
      <div className="w-full h-48 md:h-64 bg-slate-800 relative overflow-hidden shadow-sm">
        {store.storeBannerUrl ? (
          <img src={store.storeBannerUrl} alt={store.companyName} className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-700 opacity-90"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        {/* Store Header Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 shadow-sm">
          <div>
            <h1 className="heading-xl text-slate-100 mb-2 flex items-center gap-3">
              {store.companyName}
              <ShieldCheck className="w-7 h-7 text-[#ffcc00]" />
            </h1>
            <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
              {store.country && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/> {store.country}</span>
              )}
              <span className="flex items-center gap-1.5"><Box className="w-4 h-4"/> {products.length} Products</span>
            </div>
          </div>
          <button className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20 px-4 py-2.5">
            Contact Seller
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Products Grid */}
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold text-white text-slate-100 mb-6">Store Catalog</h2>
            {products.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <Box className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-slate-400 font-medium">No products listed currently.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((p: any) => (
                  <Link key={p.id} to={`/products/${p.id}`} className="bg-slate-800 border border-slate-700 rounded-2xl hover:border-cyan-500/50 hover:shadow-md transition-all overflow-hidden flex flex-col p-0 group">
                    <div className="h-52 bg-slate-900 flex items-center justify-center p-6 border-b border-slate-700">
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt={p.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Box className="w-12 h-12 text-slate-400" />
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <p className="text-xs font-semibold text-[#ffcc00] mb-1.5 uppercase tracking-wider">{p.brand}</p>
                      <h3 className="font-semibold text-slate-100 mb-3 line-clamp-2 leading-tight group-hover:text-[#ffcc00] transition-colors">{p.title}</h3>
                      <div className="mt-auto pt-4 border-t border-slate-700 flex justify-between items-end">
                        <div>
                          <p className="text-xl font-bold tracking-tight text-slate-100">${Number(p.unitCost).toFixed(2)}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">MOQ: {p.moq}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Store Policies Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sticky top-6">
              <h3 className="text-2xl font-bold text-white text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
                <Info className="w-5 h-5 text-[#ffcc00]" />
                Store Policies
              </h3>
              <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                {store.storePolicies || "This seller hasn't added custom store policies yet. Standard Hatake.Shop B2B buyer protection applies to all orders."}
              </div>
            </div>
            <VendorReviews vendorId={store.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
