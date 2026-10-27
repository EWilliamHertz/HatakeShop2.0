import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShoppingCart, X, Package, Trash2, Send, Loader2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';

export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName: string;
  sellerId: number;
  quantity?: number;
  unitCost?: number;
  moq?: number;
}

// Accept legacy `supplierId` / `supplierName` callers and normalize to seller* fields
const normalizeCartItem = (item: any): CartItem => ({
  ...item,
  sellerId: Number(item.sellerId ?? item.supplierId ?? 0),
  sellerName: item.sellerName || item.supplierName || 'Supplier',
});

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  sverigeItems: CartItem[];
  addSverigeItem: (item: CartItem) => void;
  removeSverigeItem: (productId: number) => void;
  clearSverigeCart: () => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  sverigeItems: [],
  addSverigeItem: () => {},
  removeSverigeItem: () => {},
  clearSverigeCart: () => {},
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

  const [sverigeItems, setSverigeItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('hatake_sverige_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('sample_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('hatake_sverige_cart', JSON.stringify(sverigeItems));
  }, [sverigeItems]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('sample_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setItems(parsed.filter(Boolean));
        }
        const savedSv = localStorage.getItem('hatake_sverige_cart');
        if (savedSv) {
          const parsedSv = JSON.parse(savedSv);
          if (Array.isArray(parsedSv)) setSverigeItems(parsedSv.filter(Boolean));
        }
      } catch(e) {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addItem = (rawItem: CartItem) => {
    const item = normalizeCartItem(rawItem);
    setItems(prev => {
      const exists = prev.find(i => String(i.productId) === String(item.productId));
      if (exists) {
        return prev.map(i => String(i.productId) === String(item.productId) ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) } : i);
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    setCartOpen(true);
  };

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => String(i.productId) !== String(productId)));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const q = Math.max(1, Math.floor(Number(quantity) || 1));
    setItems(prev => prev.map(i => String(i.productId) === String(productId) ? { ...i, quantity: q } : i));
  };

  const clearCart = () => setItems([]);

  const addSverigeItem = (item: CartItem) => {
    setSverigeItems(prev => {
      const exists = prev.find(i => String(i.productId) === String(item.productId));
      if (exists) {
        return prev.map(i => String(i.productId) === String(item.productId) ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) } : i);
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    setCartOpen(true);
  };

  const removeSverigeItem = (productId: number) => {
    setSverigeItems(prev => prev.filter(i => String(i.productId) !== String(productId)));
  };

  const clearSverigeCart = () => setSverigeItems([]);

  return (
    <CartContext.Provider value={{ 
      items, addItem, removeItem, updateQuantity, clearCart, 
      sverigeItems, addSverigeItem, removeSverigeItem, clearSverigeCart,
      isCartOpen, setCartOpen 
    }}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
};

const CartDrawer = () => {
  const { items, sverigeItems, isCartOpen, setCartOpen, removeItem, removeSverigeItem, updateQuantity, clearCart, clearSverigeCart } = useCart();
  const { user } = useAuth();
  const [useNetTerms, setUseNetTerms] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  const isSverige = window.location.pathname.toLowerCase().includes('sweden') || window.location.pathname.toLowerCase().includes('sverige');
  const activeItems = isSverige ? sverigeItems : items;
  const handleRemove = isSverige ? removeSverigeItem : removeItem;
  const handleClear = isSverige ? clearSverigeCart : clearCart;

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      let token = '';
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (e) {
          token = localStorage.getItem('cached_token') || '';
        }
      } else {
        token = localStorage.getItem('cached_token') || '';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api-v2/checkout/session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: activeItems.map(i => ({ productId: i.productId, quantity: i.quantity || 1 })) }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleRFQ = async () => {
    try {
      let token = '';
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (e) {
          token = localStorage.getItem('cached_token') || '';
        }
      } else {
        token = localStorage.getItem('cached_token') || '';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token && token !== 'null' && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api-v2/cart/rfq', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items }),
      });
      if (response.ok) {
        toast.success('Bulk quote request sent to suppliers');
        handleClear();
        navigate('/rfq');
        setCartOpen(false);
      } else {
        toast.error('Failed to request bulk quote');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to request bulk quote');
    }
  };

  // Group by seller
  const sellers = Array.from(new Set(activeItems.map(i => i.sellerName || 'Supplier')));

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
      <div className="relative w-full max-w-md bg-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900">
          <h2 className="text-xl font-semibold tracking-tight font-display text-slate-100 flex items-center">
            <Package className="w-5 h-5 mr-2 text-cyan-400" />
            {isSverige ? 'Svenska Butik Cart' : 'B2B Wholesale Cart'} ({activeItems.length})
          </h2>
          <div className="flex items-center gap-2">
            {activeItems.length > 0 && (
               <button onClick={handleClear} className="text-xs text-slate-400 hover:text-rose-400 font-medium transition-colors uppercase tracking-wider px-2 py-1">Clear</button>
            )}
            <button onClick={() => setCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-400 hover:bg-slate-600 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        
        {isSverige ? (
          <div className="bg-slate-900 border-b border-slate-700 p-6 flex flex-col gap-2">
            <h3 className="text-slate-100 font-bold">Din Varukorg</h3>
            <p className="text-sm text-slate-400">Tack för att du handlar hos Hatake Sverige.</p>
          </div>
        ) : (
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
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeItems.length === 0 ? (
            <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
              <ShoppingCart className="w-12 h-12 text-slate-400 mb-4" />
              <p>Your cart is empty.</p>
              <button onClick={() => setCartOpen(false)} className="mt-4 text-cyan-400 font-semibold tracking-tight hover:underline">Continue Browsing</button>
            </div>
          ) : (
            sellers.map(seller => {
              const sellerItems = activeItems.filter(i => (i.sellerName || 'Supplier') === seller);
              return (
                <div key={seller} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-none">
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-700 font-semibold tracking-tight text-slate-400 text-sm flex items-center justify-between gap-3">
                    <span className="truncate">{seller}</span>
                    {(() => {
                      const sub = sellerItems.reduce((acc, i) => acc + Number(i.unitCost || 0) * (i.quantity || 1), 0);
                      return sub > 0 ? <span className="text-xs text-slate-300 shrink-0">{isSverige ? `${sub.toFixed(2)} kr` : `€${sub.toFixed(2)}`}</span> : null;
                    })()}
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
                            <p className="text-[11px] text-slate-400 tracking-wider font-semibold mt-1 flex flex-wrap gap-x-2">
                              {item.unitCost ? <span className="text-cyan-400">{isSverige ? `${Number(item.unitCost).toFixed(2)} kr` : `€${Number(item.unitCost).toFixed(2)}`} ea</span> : null}
                              {!isSverige && item.moq ? (
                                <span className={(item.quantity || 1) >= item.moq ? 'text-emerald-400' : 'text-amber-400'}>
                                  {(item.quantity || 1) >= item.moq ? 'Wholesale' : `Sample · MOQ ${item.moq}`}
                                </span>
                              ) : null}
                            </p>
                            </div>
                            </div>
                            {!isSverige ? (
                              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg shrink-0">
                                <button aria-label="Decrease quantity" onClick={() => updateQuantity(item.productId, (item.quantity || 1) - 1)} className="p-1.5 text-slate-400 hover:text-white"><Minus className="w-3 h-3" /></button>
                                <input
                                  type="number" min={1} value={item.quantity || 1}
                                  onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10))}
                                  aria-label="Quantity"
                                  className="w-12 bg-transparent text-center text-sm text-slate-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button aria-label="Increase quantity" onClick={() => updateQuantity(item.productId, (item.quantity || 1) + 1)} className="p-1.5 text-slate-400 hover:text-white"><Plus className="w-3 h-3" /></button>
                              </div>
                            ) : <span className="text-xs text-slate-400 shrink-0">x{item.quantity || 1}</span>}
                        <button onClick={() => handleRemove(item.productId)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-xl transition-colors shrink-0">
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

        {activeItems.length > 0 && (
          <div className="p-6 border-t border-slate-700 bg-slate-800 space-y-3">
            {!isSverige && (
              <>
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700 mb-2 cursor-pointer" onClick={() => setUseNetTerms(!useNetTerms)}>
                  <div>
                    <p className="text-sm font-bold text-slate-200">Pay on Net-30 Terms</p>
                    <p className="text-xs text-slate-400">Zero interest for 30 days</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${useNetTerms ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${useNetTerms ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {activeItems.reduce((acc, i) => acc + (i.quantity || 1), 0) > 50 && (
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
              </>
            )}
            {(() => {
              const subtotal = activeItems.reduce((acc, i) => acc + (Number(i.unitCost || 0) * (i.quantity || 1)), 0);
              const baseShipping = isSverige ? 49 : 15;
              return (
                <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>{isSverige ? 'Delsumma' : 'Subtotal'}</span>
                    <span className="font-semibold text-white">
                      {isSverige ? `${subtotal.toFixed(2)} kr` : `€${subtotal.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{isSverige ? 'Frakt (Standard)' : 'Shipping (Standard)'}</span>
                    <span className="font-semibold text-cyan-400">
                      {isSverige ? `${baseShipping.toFixed(2)} kr` : `€${baseShipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-1.5 flex justify-between text-slate-200 font-bold text-sm">
                    <span>{isSverige ? 'Totalt beräknat' : 'Estimated Total'}</span>
                    <span className="text-cyan-300">
                      {isSverige ? `${(subtotal + baseShipping).toFixed(2)} kr` : `€${(subtotal + baseShipping).toFixed(2)}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    {isSverige 
                      ? 'Leveransadress och fraktmetod anges och bekräftas i kassan.' 
                      : 'Delivery address and shipping carrier options are entered at checkout.'}
                  </p>
                </div>
              );
            })()}

            <button onClick={handleCheckout} disabled={isCheckingOut} className="btn-primary w-full disabled:opacity-50">
              {isCheckingOut ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isCheckingOut 
                ? (isSverige ? 'Öppnar säker kassa...' : 'Preparing checkout...') 
                : `${isSverige ? 'Gå till kassan' : 'Checkout'} (${activeItems.length} ${activeItems.length === 1 ? (isSverige ? 'produkt' : 'Item') : (isSverige ? 'produkter' : 'Items')})`}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              {isSverige ? 'Säker betalning med Stripe.' : 'Proceed to secure checkout with Stripe.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

