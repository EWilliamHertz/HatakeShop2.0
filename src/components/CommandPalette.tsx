import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Package, ExternalLink, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from './SampleCart';

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { addItem, setCartOpen } = useCart();
  
  // Mock DB for instant search
  const products = [
    { id: 1, sku: 'SKU-001', title: 'Pokemon TCG: Scarlet & Violet ETB', price: 35.00 },
    { id: 2, sku: 'SKU-002', title: 'CS5 Vstar Deck 100', price: 12.50 },
    { id: 3, sku: 'SKU-003', title: '30th Anniversary V3', price: 25.00 },
    { id: 4, sku: 'SKU-004', title: 'CSV9.5 Sylveon Gift Box', price: 45.00 }
  ];

  const filteredProducts = search ? products.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  ) : products.slice(0, 3);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('open-command-palette', handleOpen); };
  }, []);

  const handleQuickAdd = (product: any) => {
    addItem({
      productId: product.id,
      title: product.title,
      image: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?auto=format&fit=crop&q=80&w=400',
      sellerName: 'Global Wholesale Partners',
      sellerId: 1,
      quantity: 1,
      unitCost: product.price
    });
    setIsOpen(false);
    setCartOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      
      <div className="relative bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
        
        {/* Search Header */}
        <div className="flex items-center px-4 py-4 border-b border-slate-700 bg-slate-800/50">
          <Search className="w-5 h-5 text-cyan-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by SKU or name... (Quick Order)"
            className="flex-1 bg-transparent border-none text-white text-lg focus:outline-none focus:ring-0 placeholder-slate-500"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-400">ESC</kbd>
            <button onClick={() => setIsOpen(false)} className="sm:hidden text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No products found matching "{search}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                {search ? 'Search Results' : 'Suggested Products'}
              </div>
              {filteredProducts.map(product => (
                <div key={product.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors" onClick={() => { setIsOpen(false); navigate(`/products/${product.id}`); }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                       <Package className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium group-hover:text-cyan-400 transition-colors">{product.title}</h4>
                      <p className="text-xs text-slate-400 font-mono">{product.sku} • €{product.price.toFixed(2)} / unit</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleQuickAdd(product); }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold border border-cyan-500/20 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" /> Quick Add
                    </button>
                    <button 
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
           <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↑↓</kbd> to navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Enter</kbd> to select</span>
           </div>
           <div>Hatake Command Center v1.0</div>
        </div>
      </div>
    </div>
  );
};
