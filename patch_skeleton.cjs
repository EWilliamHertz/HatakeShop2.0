const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');

const skeletonHtml = `
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 animate-pulse" style={{ animationDelay: \`\${i * 100}ms\` }}>
                  <div className="w-full aspect-[4/3] bg-slate-800 rounded-2xl"></div>
                  <div className="space-y-3 mt-2">
                    <div className="h-4 bg-slate-800 rounded-full w-3/4"></div>
                    <div className="h-3 bg-slate-800 rounded-full w-1/2"></div>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="h-5 bg-slate-800 rounded-md w-16"></div>
                    <div className="h-8 bg-slate-800 rounded-xl w-24"></div>
                  </div>
                </div>
              ))}
            </div>
`;

code = code.replace(
  `<div className="flex justify-center py-20 text-slate-400 animate-pulse">{t('Loading products...')}</div>`,
  skeletonHtml
);
fs.writeFileSync('src/pages/Marketplace.tsx', code);
