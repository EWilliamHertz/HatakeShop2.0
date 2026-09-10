import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShoppingCart, X, Package, Trash2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName: string;
  sellerId: number;
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
    const saved = localStorage.getItem('sample_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sample_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems(prev => {
      if (prev.find(i => i.productId === item.productId)) return prev;
      return [...prev, item];
    });
    setCartOpen(true);
  };

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
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
        body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, quantity: 1 })) }), // sample quantity is 1
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
          <button onClick={() => setCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-400 hover:bg-slate-600 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
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
                      <div key={item.productId} className="p-4 flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-slate-700 shrink-0 overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400 m-auto mt-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold tracking-tight text-slate-100 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Item</p>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
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
            <button onClick={handleRFQ} className="w-full flex items-center justify-center py-3.5 bg-slate-700 text-white font-semibold tracking-tight rounded-xl hover:bg-slate-600 transition-all shadow-none active:scale-95">
              Request Bulk Quote (RFQ)
            </button>
            <button onClick={handleCheckout} className="w-full flex items-center justify-center py-3.5 bg-ink text-white font-semibold tracking-tight rounded-xl hover:bg-ink-light transition-all shadow-none active:scale-95">
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

