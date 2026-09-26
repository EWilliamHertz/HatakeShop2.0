const fs = require('fs');
let code = fs.readFileSync('src/components/SampleCart.tsx', 'utf8');

const oldInterface = `export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName: string;
  sellerId: number;
}`;

const newInterface = `export interface CartItem {
  productId: number;
  title: string;
  image: string;
  sellerName: string;
  sellerId: number;
  quantity?: number;
}`;

code = code.replace(oldInterface, newInterface);

const oldCheckout = `body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, quantity: 1 })) }), // sample quantity is 1`;
const newCheckout = `body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, quantity: i.quantity || 1 })) }),`;

code = code.replace(oldCheckout, newCheckout);

const oldItemText = `<p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Item</p>`;
const newItemText = `<p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Qty: {item.quantity || 1}</p>`;

code = code.replace(oldItemText, newItemText);

fs.writeFileSync('src/components/SampleCart.tsx', code);
