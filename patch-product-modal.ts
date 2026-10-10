import fs from 'fs';
let content = fs.readFileSync('src/components/ProductModal.tsx', 'utf8');

content = content.replace(
  /export function ProductModal\(\{ product, onClose \}: \{ product: any, onClose: \(\) => void \}\) \{/,
  `export function ProductModal({ product, onClose, hideMOQ = false }: { product: any, onClose: () => void, hideMOQ?: boolean }) {`
);

content = content.replace(
  /<div className="bg-slate-800\/50 rounded-xl p-4 border border-slate-700\/50">\s*<span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">\{t\('MOQ'\)\}<\/span>\s*<span className="text-lg font-semibold text-slate-200 flex items-center gap-2">\s*<Package className="w-5 h-5 text-indigo-400" \/>\s*\{product\.moq\} \{t\('Units'\)\}\s*<\/span>\s*<\/div>/,
  `{!hideMOQ && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <span className="block text-xs uppercase tracking-wider text-slate-500 mb-1">{t('MOQ')}</span>
                  <span className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-400" />
                    {product.moq} {t('Units')}
                  </span>
                </div>
              )}`
);

fs.writeFileSync('src/components/ProductModal.tsx', content);
