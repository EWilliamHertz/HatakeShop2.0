const fs = require('fs');
let content = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

// Replace items with activeItems from line 150 onwards
let parts = content.split('const handleCheckout = async () => {');
let drawer = 'const handleCheckout = async () => {' + parts[1];

drawer = drawer.replace(/items\.map/g, 'activeItems.map');
drawer = drawer.replace(/items\.filter/g, 'activeItems.filter');
drawer = drawer.replace(/items\.length/g, 'activeItems.length');
drawer = drawer.replace(/items\.reduce/g, 'activeItems.reduce');
drawer = drawer.replace(/\{items\}/g, '{activeItems}');

drawer = drawer.replace(/clearCart\(\)/g, 'handleClear()');
drawer = drawer.replace(/clearCart\b/g, 'handleClear');
drawer = drawer.replace(/removeItem\(/g, 'handleRemove(');

drawer = drawer.replace(
  /Cart \(\{activeItems\.length\}\)/g,
  "{isSverige ? 'Svenska Butik Cart' : 'B2B Wholesale Cart'} ({activeItems.length})"
);

drawer = drawer.replace(
  /\{activeItems\.length > 0 && \(\s*<div className="p-6 border-t border-slate-700 bg-slate-800 space-y-3">\s*<div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700 mb-2 cursor-pointer" onClick=\{.*?\}\s*>\s*<div>\s*<p className="text-sm font-bold text-slate-200">Pay on Net-30 Terms<\/p>\s*<p className="text-xs text-slate-400">Zero interest for 30 days<\/p>\s*<\/div>\s*<div className=\{.*?\}\s*>\s*<div className=\{.*?\} \/>\s*<\/div>\s*<\/div>\s*\{activeItems\.reduce\(\(acc, i\) => acc \+ \(i\.quantity \|\| 1\), 0\) > 50 && \(\s*<div className="bg-amber-950\/30 border border-amber-900\/50 rounded-xl p-3 flex items-start gap-3 mb-2">\s*<Package className="w-5 h-5 text-amber-500 shrink-0 mt-0\.5" \/>\s*<div>\s*<p className="text-sm font-bold text-amber-500">LTL Freight Required<\/p>\s*<p className="text-xs text-amber-200\/70 mt-0\.5">.*?<\/p>\s*<\/div>\s*<\/div>\s*\)\}\s*<button onClick=\{handleRFQ\} className="btn-secondary w-full">\s*Request Bulk Quote \(RFQ\)\s*<\/button>/g,
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
            )}`
);


fs.writeFileSync('src/components/SampleCart.tsx', parts[0] + drawer);
