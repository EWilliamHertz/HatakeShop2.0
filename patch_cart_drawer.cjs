const fs = require('fs');
let content = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

// Replace the start of CartDrawer
content = content.replace(
  "const CartDrawer = () => {\n  const { items, isCartOpen, setCartOpen, removeItem, clearCart } = useCart();",
  `const CartDrawer = () => {
  const { items, sverigeItems, isCartOpen, setCartOpen, removeItem, removeSverigeItem, clearCart, clearSverigeCart } = useCart();
  const isSverige = window.location.pathname.toLowerCase().includes('sweden') || window.location.pathname.toLowerCase().includes('sverige');
  const activeItems = isSverige ? sverigeItems : items;
  const handleRemove = isSverige ? removeSverigeItem : removeItem;
  const handleClear = isSverige ? clearSverigeCart : clearCart;`
);

// We must carefully replace `items` with `activeItems` inside CartDrawer.
// Since CartDrawer goes to the end of the file, we can just replace in the second half of the file.
const drawerStart = content.indexOf('const CartDrawer = () => {');
const beforeDrawer = content.slice(0, drawerStart);
let drawerContent = content.slice(drawerStart);

drawerContent = drawerContent.replace(/items\.map/g, 'activeItems.map');
drawerContent = drawerContent.replace(/items\.filter/g, 'activeItems.filter');
drawerContent = drawerContent.replace(/items\.length/g, 'activeItems.length');
drawerContent = drawerContent.replace(/items\.reduce/g, 'activeItems.reduce');
drawerContent = drawerContent.replace(/removeItem\(/g, 'handleRemove(');
drawerContent = drawerContent.replace(/clearCart\(\)/g, 'handleClear()');

// Replace "Cart" text with conditional "Svenska Butik Cart"
drawerContent = drawerContent.replace(
  /Cart \(\{/g,
  "{isSverige ? 'Svenska Butik Cart' : 'B2B Wholesale Cart'} ({"
);

// We need to also conditionally hide the RFQ and Net-30 for Svenska Butik
drawerContent = drawerContent.replace(
  /\{activeItems\.length > 0 && \(/,
  `{activeItems.length > 0 && (
          <div className="p-6 border-t border-slate-700 bg-slate-800 space-y-3">
            {!isSverige && (
              <>
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700 mb-2 cursor-pointer" onClick={() => setUseNetTerms(!useNetTerms)}>
                  <div>
                    <p className="text-sm font-bold text-slate-200">Pay on Net-30 Terms</p>
                    <p className="text-xs text-slate-400">Zero interest for 30 days</p>
                  </div>
                  <div className={\`w-10 h-6 rounded-full transition-colors flex items-center px-1 \${useNetTerms ? 'bg-cyan-500' : 'bg-slate-700'}\`}>
                    <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${useNetTerms ? 'translate-x-4' : 'translate-x-0'}\`} />
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

            <button onClick={handleCheckout} className="btn-primary w-full">
              <Send className="w-4 h-4 mr-2" />
              Checkout ({activeItems.length} {activeItems.length === 1 ? 'Item' : 'Items'})
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              Proceed to secure checkout.
            </p>
          </div>
        )}`
);

// We need to remove the old HTML for net30 and rfq that is now wrapped in !isSverige.
// Because it's hard to regex the exact multiline, I'll just use a smarter replace.
fs.writeFileSync('src/components/SampleCart.tsx', beforeDrawer + drawerContent);
