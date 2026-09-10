import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { useCurrency } from '../components/CurrencyContext.tsx';
import { useTranslation } from 'react-i18next';
import { PackageSearch, MapPin } from 'lucide-react';
import { ProductModal } from '../components/ProductModal.tsx';
import { WishlistButton } from '../components/WishlistButton.tsx';

export function Wishlist() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchWishlist = async () => {
      try {
        let token = await user.getIdToken();
        const res = await fetch('/api-v2/wishlists', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const items = await res.json();
          const productIds = items.map((i: any) => i.productId).join(',');
          if (productIds) {
            const prodRes = await fetch(`/api-v2/products?ids=${productIds}`);
            if (prodRes.ok) {
              const data = await prodRes.json();
              setProducts(data.products || []);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-slate-400">Please log in to view your wishlist.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-white mb-8">My Wishlist</h1>
      {products.length === 0 ? (
        <div className="p-8 text-center text-slate-400">Your wishlist is empty.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all rounded-2xl overflow-hidden group shadow-lg flex flex-col relative"
            >
              <WishlistButton productId={p.id} />
              <div className="relative h-48 bg-slate-800 overflow-hidden flex items-center justify-center">
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <PackageSearch className="w-10 h-10 text-slate-600" />
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-white line-clamp-1 mb-1">{p.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{p.description}</p>
                <div className="mt-auto space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500">{t('Est. Price')}</span>
                      <span className="font-extrabold text-white">{formatPrice(p.unitPrice || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => {
            setSelectedProduct(null);
            // Re-fetch wishlist if needed, or rely on local state
          }} 
        />
      )}
    </div>
  );
}
