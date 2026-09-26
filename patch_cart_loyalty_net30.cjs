const fs = require('fs');

let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

// Add state for Net-30
if (!code.includes('const [useNetTerms, setUseNetTerms]')) {
  code = code.replace(
    'const { items, isCartOpen, setCartOpen, removeItem, clearCart } = useCart();',
    'const { items, isCartOpen, setCartOpen, removeItem, clearCart } = useCart();\n  const [useNetTerms, setUseNetTerms] = useState(false);'
  );
}

// Ensure useState is imported
if (!code.includes('useState')) {
  code = code.replace('import React,', 'import React, { useState },');
}

// Add Loyalty Progress Bar
const loyaltyUI = `
        <div className="bg-slate-900 border-b border-slate-700 p-6 flex flex-col gap-2">
          <div className="flex justify-between items-end">
             <div>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">Gold Tier</p>
                <p className="text-sm text-slate-300">You are <span className="font-bold text-white">€1,200</span> away from unlocking <span className="text-[#ffcc00] font-bold">Platinum Tier (5% off)</span>.</p>
             </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
             <div className="h-full bg-gradient-to-r from-cyan-500 to-[#ffcc00] rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
`;

if (!code.includes('Gold Tier')) {
  code = code.replace(
    '<div className="flex-1 overflow-y-auto p-6 space-y-6">',
    loyaltyUI + '\n        <div className="flex-1 overflow-y-auto p-6 space-y-6">'
  );
}

// Add Net-30 Toggle
const net30UI = `
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700 mb-2 cursor-pointer" onClick={() => setUseNetTerms(!useNetTerms)}>
              <div>
                <p className="text-sm font-bold text-slate-200">Pay on Net-30 Terms</p>
                <p className="text-xs text-slate-400">Zero interest for 30 days</p>
              </div>
              <div className={\`w-10 h-6 rounded-full transition-colors flex items-center px-1 \${useNetTerms ? 'bg-cyan-500' : 'bg-slate-700'}\`}>
                <div className={\`w-4 h-4 rounded-full bg-white transition-transform \${useNetTerms ? 'translate-x-4' : 'translate-x-0'}\`} />
              </div>
            </div>
`;

if (!code.includes('Pay on Net-30 Terms')) {
  code = code.replace(
    '<button onClick={handleRFQ} className="btn-secondary w-full">',
    net30UI + '\n            <button onClick={handleRFQ} className="btn-secondary w-full">'
  );
}

// Update handleCheckout alert if Net-30 is selected
code = code.replace(
  "alert('Stripe Checkout simulated!');",
  "if (useNetTerms) { alert('Net-30 Invoice Generated via Stripe!'); setCartOpen(false); clearCart(); return; }\n      alert('Stripe Checkout simulated!');"
);

fs.writeFileSync('src/components/SampleCart.tsx', code);
