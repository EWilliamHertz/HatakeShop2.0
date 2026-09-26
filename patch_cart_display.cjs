const fs = require('fs');

// 1. Update SampleCart.tsx interface and UI
let cartCode = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

const oldInterface = `export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName: string;
  sellerId: number;
  quantity?: number;
}`;
const newInterface = `export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName: string;
  sellerId: number;
  quantity?: number;
  unitCost?: number;
}`;
cartCode = cartCode.replace(oldInterface, newInterface);

// Add clickable link and unit price to the cart item rendering
const oldItemRender = `<div key={item.productId} className="p-4 flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-slate-700 shrink-0 overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400 m-auto mt-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold tracking-tight text-slate-100 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Qty: {item.quantity || 1}</p>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>`;

const newItemRender = `<div key={item.productId} className="p-4 flex items-center gap-4 group hover:bg-slate-700/30 transition-colors">
                        <div onClick={() => { setCartOpen(false); navigate(\`/products/\${item.productId}\`); }} className="cursor-pointer flex items-center gap-4 flex-1 min-w-0">
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
                        <button onClick={() => removeItem(item.productId)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>`;

cartCode = cartCode.replace(oldItemRender, newItemRender);
fs.writeFileSync('src/components/SampleCart.tsx', cartCode);

// 2. Update Onboarding.tsx to include unitCost
let onboardCode = fs.readFileSync('src/pages/Onboarding.tsx', 'utf8');
const oldOnboardMap = `              sellerId: ci.product.sellerId,
              quantity: ci.quantity // For UI display if needed
           };`;
const newOnboardMap = `              sellerId: ci.product.sellerId,
              quantity: ci.quantity, // For UI display if needed
              unitCost: ci.product.unitCost
           };`;
onboardCode = onboardCode.replace(oldOnboardMap, newOnboardMap);
fs.writeFileSync('src/pages/Onboarding.tsx', onboardCode);

