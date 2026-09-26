const fs = require('fs');

let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

const freightUI = `
            {items.reduce((acc, i) => acc + (i.quantity || 1), 0) > 50 && (
               <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3 flex items-start gap-3 mb-2">
                  <Package className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-sm font-bold text-amber-500">LTL Freight Required</p>
                     <p className="text-xs text-amber-200/70 mt-0.5">This order exceeds standard parcel limits. Checkout will push this to a Deal Room to manually secure a pallet freight quote.</p>
                  </div>
               </div>
            )}
`;

if (!code.includes('LTL Freight Required')) {
  code = code.replace(
    '<button onClick={handleRFQ} className="btn-secondary w-full">',
    freightUI + '\n            <button onClick={handleRFQ} className="btn-secondary w-full">'
  );
  fs.writeFileSync('src/components/SampleCart.tsx', code);
}
