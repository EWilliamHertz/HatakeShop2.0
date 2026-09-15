const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf-8');

// Inject useCurrency
code = code.replace("import { useTranslation } from 'react-i18next';", "import { useTranslation } from 'react-i18next';\nimport { useCurrency } from '../components/CurrencyContext.tsx';");
code = code.replace("const { t } = useTranslation();", "const { t } = useTranslation();\n  const { formatPrice } = useCurrency();");

// Replace calculations
const newCalcs = `
  const maxPotentialRevenue = products.reduce((acc, p) => {
    let highestPrice = parseFloat(p.unitPrice || '0');
    if (p.tieredPricing && Array.isArray(p.tieredPricing) && p.tieredPricing.length > 0) {
      highestPrice = Math.max(highestPrice, ...p.tieredPricing.map((t: any) => parseFloat(t.price || t.unitPrice || '0')));
    }
    const qty = parseInt(p.stockQuantity || '0');
    return acc + (highestPrice * qty);
  }, 0);

  const minPotentialRevenue = products.reduce((acc, p) => {
    let lowestPrice = parseFloat(p.unitPrice || '0');
    if (p.tieredPricing && Array.isArray(p.tieredPricing) && p.tieredPricing.length > 0) {
      const prices = p.tieredPricing.map((t: any) => parseFloat(t.price || t.unitPrice || '0')).filter((v: number) => !isNaN(v) && v > 0);
      if (prices.length > 0) {
        lowestPrice = Math.min(...prices);
      }
    }
    if (lowestPrice === 0) lowestPrice = parseFloat(p.unitPrice || '0');
    const qty = parseInt(p.stockQuantity || '0');
    return acc + (lowestPrice * qty);
  }, 0);
`;
code = code.replace(/const lowestTierProfit = [\s\S]*?}, 0\);[\s]*const highestTierProfit = [\s\S]*?}, 0\);/, newCalcs);

// Replace JSX UI
const newUI = `
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2 animate-in fade-in slide-in-from-bottom-2 p-6 md:px-8">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
             <div className="text-sm text-slate-400 font-medium mb-1">{t('Max Potential Revenue')}</div>
             <div className="text-3xl font-black text-emerald-600">{formatPrice(maxPotentialRevenue)}</div>
             <div className="text-xs text-slate-400 mt-2">{t('Potential revenue if all stock is sold at the highest possible sale price (lowest volume tier).')}</div>
           </div>
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
             <div className="text-sm text-slate-400 font-medium mb-1">{t('Min Potential Revenue')}</div>
             <div className="text-3xl font-black text-[var(--color-accent)]">{formatPrice(minPotentialRevenue)}</div>
             <div className="text-xs text-slate-400 mt-2">{t('Potential revenue if all stock is sold at the lowest possible sale price (highest volume tier).')}</div>
           </div>
        </div>
`;
code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2 animate-in fade-in slide-in-from-bottom-2 p-6 md:px-8">[\s\S]*?<\/div>\s*<\/div>/, newUI.trim());

fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
