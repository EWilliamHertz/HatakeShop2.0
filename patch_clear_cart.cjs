const fs = require('fs');
let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

const oldHeader = `<h2 className="text-xl font-semibold tracking-tight font-display text-slate-100 flex items-center">
            <Package className="w-5 h-5 mr-2 text-[#ffcc00]" />
            Cart ({items.length})
          </h2>
          <button onClick={() => setCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-400 hover:bg-slate-600 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>`;

const newHeader = `<h2 className="text-xl font-semibold tracking-tight font-display text-slate-100 flex items-center">
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
        </div>`;

code = code.replace(oldHeader, newHeader);
fs.writeFileSync('src/components/SampleCart.tsx', code);
