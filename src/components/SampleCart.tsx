import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShoppingCart, X, Package, Trash2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName: string;
  sellerId: number;
  quantity?: number;
  unitCost?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  clearCart: () => {},
  isCartOpen: false,
  setCartOpen: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sample_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sample_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('sample_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setItems(parsed.filter(Boolean));
        }
      } catch(e) {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addItem = (item: CartItem) => {
    setItems(prev => {
      if (prev.find(i => i.productId === item.productId)) return prev;
      return [...prev, item];
    });
    setCartOpen(true);
  };

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => String(i.productId) !== String(productId)));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isCartOpen, setCartOpen }}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
};

const CartDrawer = () => {
  const { items, isCartOpen, setCartOpen, removeItem, clearCart } = useCart();
  const [useNetTerms, setUseNetTerms] = useState(false);
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api-v2/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // assuming token is used
        },
        body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, quantity: i.quantity || 1 })) }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error(err);
      alert('Checkout failed');
    }
  };

  const handleRFQ = async () => {
    try {
      const response = await fetch('/api-v2/cart/rfq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ items }),
      });
      if (response.ok) {
        clearCart();
        navigate('/rfq');
        setCartOpen(false);
      } else {
        alert('Failed to request bulk quote');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to request bulk quote');
    }
  };

  // Group by seller
  const sellers = Array.from(new Set(items.map(i => i.sellerName)));

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
      <div className="relative w-full max-w-md bg-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900">
          <h2 className="text-xl font-semibold tracking-tight font-display text-slate-100 flex items-center">
            <Package className="w-5 h-5 mr-2 text-[#ffcc00]" />
            Cart ({items.length})
          </h2>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
               <button onClick={clearCart} className="text-xs text-slate-400 hover:text-rose-400 font-medium transition-colors uppercase tracking-wider px-2 py-1">Clear</button>
            )}
            <button onClick={() => setCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-400 hover:bg-slate-600 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        
        <div className="bg-slate-900 border-b border-slate-700 p-6 flex flex-col gap-2">
          {(() => {
             const totalSpend = 0; // TODO: Fetch from user profile orders
             let currentTier = "Standard Tier";
             let nextTier = "Bronze Tier (0.5% Reduced Commission)";
             let amountAway = 1500 - totalSpend;
             let progressPercent = (totalSpend / 1500) * 100;
             let colorClass = "text-slate-400";
             let nextColorClass = "text-[#cd7f32]"; // Bronze color
             let gradientFrom = "from-slate-500";
             let gradientTo = "to-[#cd7f32]";
             
             if (totalSpend >= 25000) {
                currentTier = "Gold Tier (1.5% Reduced Commission)";
                nextTier = "Max Tier Reached!";
                amountAway = 0;
                progressPercent = 100;
                colorClass = "text-[#ffcc00]";
                gradientFrom = "from-[#ffcc00]";
                gradientTo = "to-[#ffcc00]";
             } else if (totalSpend >= 5000) {
                currentTier = "Silver Tier (1.0% Reduced Commission)";
                nextTier = "Gold Tier (1.5% Reduced Commission)";
                amountAway = 25000 - totalSpend;
                progressPercent = ((totalSpend - 5000) / 20000) * 100;
                colorClass = "text-slate-300";
                nextColorClass = "text-[#ffcc00]";
                gradientFrom = "from-slate-300";
                gradientTo = "to-[#ffcc00]";
             } else if (totalSpend >= 1500) {
                currentTier = "Bronze Tier (0.5% Reduced Commission)";
                nextTier = "Silver Tier (1.0% Reduced Commission)";
                amountAway = 5000 - totalSpend;
                progressPercent = ((totalSpend - 1500) / 3500) * 100;
                colorClass = "text-[#cd7f32]";
                nextColorClass = "text-slate-300";
                gradientFrom = "from-[#cd7f32]";
                gradientTo = "to-slate-300";
             }
             
             return (
               <>
                 <div className="flex justify-between items-end">
                    <div>
                       <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${colorClass}`}>{currentTier}</p>
                       {amountAway > 0 ? (
                         <p className="text-sm text-slate-300">You are <span className="font-bold text-white">€{amountAway.toLocaleString()}</span> away from unlocking <span className={`font-bold ${nextColorClass}`}>{nextTier}</span>.</p>
                       ) : (
                         <p className="text-sm text-[#ffcc00] font-bold">Congratulations! You have reached the maximum discount tier.</p>
                       )}
                    </div>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
                    <div className={`h-full bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}></div>
                 </div>
               </>
             );
          })()}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
              <ShoppingCart className="w-12 h-12 text-slate-400 mb-4" />
              <p>Your cart is empty.</p>
              <button onClick={() => setCartOpen(false)} className="mt-4 text-[#ffcc00] font-semibold tracking-tight hover:underline">Continue Browsing</button>
            </div>
          ) : (
            sellers.map(seller => {
              const sellerItems = items.filter(i => i.sellerName === seller);
              return (
                <div key={seller} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-none">
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 font-semibold tracking-tight text-slate-400 text-sm">
                    {seller}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {sellerItems.map(item => (
                      <div key={item.productId} className="p-4 flex items-center gap-4 group hover:bg-slate-700/30 transition-colors">
                        <div onClick={() => { setCartOpen(false); navigate(`/products/${item.productId}`); }} className="cursor-pointer flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-700 shrink-0 overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400 m-auto mt-3" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold tracking-tight text-slate-100 truncate hover:text-cyan-400 transition-colors">{item.title}</p>
                            <p className="text-[11px] text-slate-400 tracking-wider font-semibold mt-1 flex gap-2">
                               <span>QTY: {item.quantity || 1}</span>
                               {item.unitCost && <span className="text-cyan-400">| €{Number(item.unitCost).toFixed(2)} ea</span>}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-xl transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-slate-700 bg-slate-800 space-y-3">
            
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700 mb-2 cursor-pointer" onClick={() => setUseNetTerms(!useNetTerms)}>
              <div>
                <p className="text-sm font-bold text-slate-200">Pay on Net-30 Terms</p>
                <p className="text-xs text-slate-400">Zero interest for 30 days</p>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${useNetTerms ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useNetTerms ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            
            {items.reduce((acc, i) => acc + (i.quantity || 1), 0) > 50 && (
               <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3 flex items-start gap-3 mb-2">
                  <Package className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-sm font-bold text-amber-500">LTL Freight Required</p>
                     <p className="text-xs text-amber-200/70 mt-0.5">This order exceeds standard parcel limits. Checkout will push this to a Deal Room to manually secure a pallet freight quote.</p>
                  </div>
               </div>
            )}

            <button onClick={handleRFQ} className="btn-secondary w-full">
              Request Bulk Quote (RFQ)
            </button>
            <button onClick={handleCheckout} className="btn-primary w-full">
              <Send className="w-4 h-4 mr-2" />
              Checkout ({items.length} {items.length === 1 ? 'Item' : 'Items'})
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              Proceed to secure checkout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

