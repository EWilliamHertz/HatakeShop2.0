import React, { createContext, useContext, useState, useEffect } from 'react';
import { ShoppingCart, X, Package, Trash2, Send, Loader2, Minus, Plus, Truck, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext.tsx';
import { useSiteMode } from './SiteModeContext.tsx';
import { useCurrency } from './CurrencyProvider.tsx';
import { SafeImage } from './SafeImage.tsx';

export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName?: string;
  sellerId?: number;
  supplierName?: string;
  supplierId?: number;
  quantity?: number;
  unitCost?: number;
  moq?: number;
  stockQuantity?: number;
  isPreorder?: boolean;
  preorderLabel?: string;
}

// Accept legacy `supplierId` / `supplierName` callers and normalize to seller* & supplier* fields
export const normalizeCartItem = (item: any): CartItem => {
  const resolvedId = Number(item.sellerId ?? item.supplierId ?? 1) || 1;
  const resolvedName = item.sellerName || item.supplierName || 'Hatake Sverige';
  return {
    ...item,
    productId: Number(item.productId),
    sellerId: resolvedId,
    supplierId: resolvedId,
    sellerName: resolvedName,
    supplierName: resolvedName,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitCost: Number(item.unitCost ?? item.sverigePrice ?? 0) || 0,
  };
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  sverigeItems: CartItem[];
  addSverigeItem: (item: CartItem) => void;
  removeSverigeItem: (productId: number) => void;
  updateSverigeQuantity: (productId: number, quantity: number) => void;
  clearSverigeCart: () => void;
  activeCartCount: number;
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
  updateSverigeQuantity: () => {},
  clearSverigeCart: () => {},
  activeCartCount: 0,
  isCartOpen: false,
  setCartOpen: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isB2C } = useSiteMode();

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sample_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(normalizeCartItem) : [];
    } catch {
      return [];
    }
  });

  const [sverigeItems, setSverigeItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('hatake_sverige_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(normalizeCartItem) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('sample_cart', JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('hatake_sverige_cart', JSON.stringify(sverigeItems));
    } catch {}
  }, [sverigeItems]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('sample_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setItems(parsed.filter(Boolean).map(normalizeCartItem));
        }
        const savedSv = localStorage.getItem('hatake_sverige_cart');
        if (savedSv) {
          const parsedSv = JSON.parse(savedSv);
          if (Array.isArray(parsedSv)) setSverigeItems(parsedSv.filter(Boolean).map(normalizeCartItem));
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addItem = (rawItem: CartItem) => {
    const item = normalizeCartItem(rawItem);
    setItems((prev) => {
      const exists = prev.find((i) => String(i.productId) === String(item.productId));
      if (exists) {
        return prev.map((i) =>
          String(i.productId) === String(item.productId)
            ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    setCartOpen(true);
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => String(i.productId) !== String(productId)));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    const q = Math.max(1, Math.floor(Number(quantity) || 1));
    setItems((prev) => prev.map((i) => (String(i.productId) === String(productId) ? { ...i, quantity: q } : i)));
  };

  const clearCart = () => setItems([]);

  const addSverigeItem = (rawItem: CartItem) => {
    const item = normalizeCartItem(rawItem);
    setSverigeItems((prev) => {
      const exists = prev.find((i) => String(i.productId) === String(item.productId));
      if (exists) {
        return prev.map((i) =>
          String(i.productId) === String(item.productId)
            ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    setCartOpen(true);
  };

  const removeSverigeItem = (productId: number) => {
    setSverigeItems((prev) => prev.filter((i) => String(i.productId) !== String(productId)));
  };

  const updateSverigeQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeSverigeItem(productId);
      return;
    }
    const q = Math.max(1, Math.floor(Number(quantity) || 1));
    setSverigeItems((prev) =>
      prev.map((i) => (String(i.productId) === String(productId) ? { ...i, quantity: q } : i))
    );
  };

  const clearSverigeCart = () => setSverigeItems([]);

  const activeCartCount = isB2C
    ? sverigeItems.reduce((acc, i) => acc + (i.quantity || 1), 0)
    : items.reduce((acc, i) => acc + (i.quantity || 1), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        sverigeItems,
        addSverigeItem,
        removeSverigeItem,
        updateSverigeQuantity,
        clearSverigeCart,
        activeCartCount,
        isCartOpen,
        setCartOpen,
      }}
    >
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
};

const FREE_SHIPPING_THRESHOLD_SEK = 999;

const CartDrawer = () => {
  const {
    items,
    sverigeItems,
    isCartOpen,
    setCartOpen,
    removeItem,
    removeSverigeItem,
    updateQuantity,
    updateSverigeQuantity,
    clearCart,
    clearSverigeCart,
  } = useCart();
  const { user } = useAuth();
  const { isB2C } = useSiteMode();
  const { formatPrice, formatSEK } = useCurrency();
  const { t } = useTranslation();
  const [useNetTerms, setUseNetTerms] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shippingTier, setShippingTier] = useState<'standard' | 'express'>('standard');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [cartTab, setCartTab] = useState<'b2c' | 'b2b'>(isB2C ? 'b2c' : 'b2b');
  const navigate = useNavigate();

  useEffect(() => {
    setCartTab(isB2C ? 'b2c' : 'b2b');
  }, [isB2C, isCartOpen]);

  useEffect(() => {
    if (user?.email && !customerEmail) {
      setCustomerEmail(user.email);
    }
  }, [user?.email]);

  if (!isCartOpen) return null;

  const isSverige = cartTab === 'b2c';
  const activeItems = isSverige ? sverigeItems : items;
  const handleRemove = isSverige ? removeSverigeItem : removeItem;
  const handleUpdateQty = isSverige ? updateSverigeQuantity : updateQuantity;
  const handleClear = isSverige ? clearSverigeCart : clearCart;
  const totalUnitCount = activeItems.reduce((acc, i) => acc + (i.quantity || 1), 0);

  const getAuthHeaders = async () => {
    let token = '';
    if (user) {
      try {
        token = await user.getIdToken();
      } catch {
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
    return headers;
  };

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      const headers = await getAuthHeaders();

      const response = await fetch('/api-v2/checkout/session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: activeItems.map((i) => ({ productId: i.productId, quantity: i.quantity || 1 })),
          isB2cOrder: isSverige,
          shippingTier,
          customerEmail: customerEmail.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || t('Checkout failed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('Checkout failed'));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleRFQ = async () => {
    if (!user) {
      toast.info(t('Please sign in to submit a bulk RFQ'));
      setCartOpen(false);
      navigate('/login');
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const normalizedPayload = items.map(normalizeCartItem);

      const response = await fetch('/api-v2/cart/rfq', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: normalizedPayload }),
      });
      if (response.ok) {
        toast.success(t('Bulk quote request sent to suppliers'));
        clearCart();
        navigate('/rfq');
        setCartOpen(false);
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || t('Failed to request bulk quote'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('Failed to request bulk quote'));
    }
  };

  // Group by seller for B2B
  const sellers = Array.from(
    new Set(activeItems.map((i) => i.sellerName || i.supplierName || (isSverige ? 'Hatake Sverige' : t('Supplier'))))
  );

  const subtotal = activeItems.reduce((acc, i) => acc + Number(i.unitCost || 0) * (i.quantity || 1), 0);
  const qualifiesForFreeShipping = isSverige && subtotal >= FREE_SHIPPING_THRESHOLD_SEK;
  const b2cShippingCost = isSverige
    ? shippingTier === 'express'
      ? 89
      : qualifiesForFreeShipping
        ? 0
        : 49
    : 15;
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_SEK - subtotal);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>{isSverige ? t('Varukorg') : t('B2B Wholesale Cart')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold tabular-nums">
              {totalUnitCount}
            </span>
          </h2>
          <div className="flex items-center gap-1.5">
            {activeItems.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-rose-400 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                {t('Clear')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              aria-label={t('Close')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* If user has items in both B2C & B2B carts, allow switching tabs cleanly */}
        {sverigeItems.length > 0 && items.length > 0 && (
          <div className="grid grid-cols-2 gap-1 p-2 bg-slate-950 border-b border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCartTab('b2c')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isSverige ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              <span>🇸🇪 {t('B2C Store')}</span>
              <span>({sverigeItems.reduce((a, b) => a + (b.quantity || 1), 0)})</span>
            </button>
            <button
              type="button"
              onClick={() => setCartTab('b2b')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isSverige ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              <span>🌐 {t('B2B RFQ')}</span>
              <span>({items.reduce((a, b) => a + (b.quantity || 1), 0)})</span>
            </button>
          </div>
        )}

        {/* Free Shipping / Loyalty Progress Banner */}
        {isSverige ? (
          <div className="bg-slate-950/70 border-b border-slate-800 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
                {qualifiesForFreeShipping ? (
                  <strong className="text-emerald-400">{t('Du har fri standardfrakt!')}</strong>
                ) : (
                  <span>
                    {t('Handla för')}{' '}
                    <strong className="text-cyan-300">{formatSEK(amountToFreeShipping)}</strong>{' '}
                    {t('till för fri frakt')}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD_SEK) * 100))}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_SEK) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/70 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              {t('Multi-Vendor Sample & Bulk RFQ Cart')}
            </span>
            <span className="text-[11px] text-cyan-400 font-semibold">{t('Escrow Protected')}</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {activeItems.length === 0 ? (
            <div className="text-center text-slate-400 py-16 px-4 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-slate-500" />
              </div>
              <p className="font-bold text-slate-200 text-base">{t('Your cart is empty.')}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {isSverige
                  ? t('Utforska vårt sortiment av TCG, graderade kort och merchandise.')
                  : t('Add product samples or wholesale quantities to request a bulk quote.')}
              </p>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="mt-5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
              >
                {t('Continue Browsing')}
              </button>
            </div>
          ) : isSverige ? (
            <div className="space-y-3">
              {activeItems.map((item) => (
                <div
                  key={item.productId}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-center gap-3.5 hover:border-slate-600 transition-colors"
                >
                  <div
                    onClick={() => {
                      setCartOpen(false);
                      navigate(`/product/${item.productId}`);
                    }}
                    className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 shrink-0 overflow-hidden cursor-pointer flex items-center justify-center"
                  >
                    <SafeImage
                      src={item.image}
                      alt={item.title}
                      fallbackIcon={<Package className="w-6 h-6 text-slate-600" />}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        navigate(`/product/${item.productId}`);
                      }}
                      className="text-left text-sm font-bold text-slate-100 hover:text-cyan-400 transition-colors line-clamp-2 leading-snug"
                    >
                      {item.title}
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-extrabold text-cyan-400 tabular-nums">
                        {formatSEK(item.unitCost)}
                      </span>
                      {item.isPreorder && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                          {t('Förhandsbokning')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="inline-flex items-center bg-slate-950 border border-slate-700 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          aria-label={t('Decrease quantity')}
                          onClick={() => handleUpdateQty(item.productId, (item.quantity || 1) - 1)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity || 1}
                          onChange={(e) => handleUpdateQty(item.productId, parseInt(e.target.value, 10) || 1)}
                          aria-label={t('Quantity')}
                          className="w-10 bg-transparent text-center text-xs font-bold text-slate-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label={t('Increase quantity')}
                          onClick={() => handleUpdateQty(item.productId, (item.quantity || 1) + 1)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white tabular-nums">
                          {formatSEK(Number(item.unitCost || 0) * (item.quantity || 1))}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.productId)}
                          aria-label={t('Remove')}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            sellers.map((seller) => {
              const sellerItems = activeItems.filter(
                (i) => (i.sellerName || i.supplierName || t('Supplier')) === seller
              );
              const sellerSub = sellerItems.reduce(
                (acc, i) => acc + Number(i.unitCost || 0) * (i.quantity || 1),
                0
              );
              return (
                <div
                  key={seller}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden"
                >
                  <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-700/80 font-bold text-slate-300 text-xs flex items-center justify-between gap-2">
                    <span className="truncate flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {seller}
                    </span>
                    {sellerSub > 0 && (
                      <span className="text-xs text-cyan-300 font-mono shrink-0">
                        {formatPrice(sellerSub)}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-700/60">
                    {sellerItems.map((item) => (
                      <div
                        key={item.productId}
                        className="p-3.5 flex items-center gap-3 hover:bg-slate-700/20 transition-colors"
                      >
                        <div
                          onClick={() => {
                            setCartOpen(false);
                            navigate(`/product/${item.productId}`);
                          }}
                          className="cursor-pointer flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                            <SafeImage
                              src={item.image}
                              alt={item.title}
                              fallbackIcon={<Package className="w-5 h-5 text-slate-500" />}
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-100 truncate hover:text-cyan-400 transition-colors">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex flex-wrap gap-x-2">
                              {item.unitCost ? (
                                <span className="text-cyan-400">{formatPrice(Number(item.unitCost))} / st</span>
                              ) : null}
                              {item.moq ? (
                                <span
                                  className={
                                    (item.quantity || 1) >= item.moq ? 'text-emerald-400' : 'text-amber-400'
                                  }
                                >
                                  {(item.quantity || 1) >= item.moq
                                    ? t('Wholesale')
                                    : `${t('Sample')} · MOQ ${item.moq}`}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg shrink-0">
                          <button
                            type="button"
                            aria-label={t('Decrease quantity')}
                            onClick={() => handleUpdateQty(item.productId, (item.quantity || 1) - 1)}
                            className="p-1.5 text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity || 1}
                            onChange={(e) =>
                              handleUpdateQty(item.productId, parseInt(e.target.value, 10) || 1)
                            }
                            aria-label={t('Quantity')}
                            className="w-11 bg-transparent text-center text-xs font-bold text-slate-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            aria-label={t('Increase quantity')}
                            onClick={() => handleUpdateQty(item.productId, (item.quantity || 1) + 1)}
                            className="p-1.5 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(item.productId)}
                          aria-label={t('Remove')}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                        >
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

        {/* Drawer Footer */}
        {activeItems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/95 space-y-3">
            {isSverige ? (
              <>
                {/* B2C Shipping Options */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShippingTier('standard')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      shippingTier === 'standard'
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>PostNord / DHL</span>
                      <span className="text-cyan-300">
                        {qualifiesForFreeShipping ? t('Gratis') : '49 kr'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t('1–3 vardagar (Sverige)')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingTier('express')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      shippingTier === 'express'
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{t('Expressfrakt')}</span>
                      <span className="text-cyan-300">89 kr</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t('1–2 vardagar')}</div>
                  </button>
                </div>

                {/* Optional guest email for receipt */}
                {!user && (
                  <div>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={t('Din e-postadress för orderbekräftelse (valfritt)')}
                      aria-label={t('Email Address')}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 cursor-pointer"
                  onClick={() => setUseNetTerms(!useNetTerms)}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200">{t('Pay on Net-30 Terms')}</p>
                    <p className="text-[11px] text-slate-400">{t('Zero interest for 30 days for verified buyers')}</p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                      useNetTerms ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        useNetTerms ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                <button type="button" onClick={handleRFQ} className="btn-secondary w-full !py-2.5 text-xs sm:text-sm">
                  {t('Request Bulk Quote (RFQ)')}
                </button>
              </>
            )}

            {/* Order Summary Box */}
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>{t('Subtotal')}</span>
                <span className="font-bold text-white tabular-nums">
                  {isSverige ? formatSEK(subtotal) : formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{t('Shipping')}</span>
                <span className="font-bold text-cyan-400 tabular-nums">
                  {isSverige
                    ? b2cShippingCost === 0
                      ? t('Gratis (0 kr)')
                      : formatSEK(b2cShippingCost)
                    : formatPrice(b2cShippingCost)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-1.5 flex justify-between text-white font-extrabold text-sm">
                <span>{t('Total (inkl. moms)')}</span>
                <span className="text-cyan-300 tabular-nums">
                  {isSverige ? formatSEK(subtotal + b2cShippingCost) : formatPrice(subtotal + b2cShippingCost)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {isCheckingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {isCheckingOut
                  ? t('Preparing secure checkout...')
                  : `${t('Till kassan')} (${totalUnitCount})`}
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t('Säker kortbetalning med Stripe · Snabb leverans från Sverige')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
