import fs from 'fs';

let content = fs.readFileSync('src/pages/CompanyProfile.tsx', 'utf-8');

content = content.replace(
  /{products && products.length > 4 && \(\s*<Link to={`\/company\/\${id}\/listings`}.*?View All <ArrowRight className="w-4 h-4" \/>\s*<\/Link>\s*\)}/s,
  `{products && products.length > 3 && (
                  <Link to={\`/company/\${id}/listings\`} onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-xl hover:bg-cyan-500/10 transition-all">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                )}`
);

content = content.replace(
  /{products && products\.length > 3 && \(\s*<Link to={`\/company\/\${id}\/listings`}.*?{products\.length} Products<\/span>\s*<\/Link>\s*\)}/s,
  `{products && products.length > 3 && (
                      <Link to={\`/company/\${id}/listings\`} onClick={() => window.scrollTo(0, 0)} className="group bg-slate-900/50 rounded-2xl border border-slate-800/60 overflow-hidden hover:border-cyan-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-900/20 transition-all duration-300 flex flex-col items-center justify-center h-full min-h-[250px] text-center p-6 cursor-pointer">
                         <div className="w-14 h-14 rounded-full bg-slate-800 shadow-none text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-900 transition-all duration-300 border border-slate-700 group-hover:border-transparent">
                           <ArrowRight className="w-6 h-6 mb-1" />
                         </div>
                         <span className="text-xs font-bold tracking-wider uppercase">View All</span>
                         <span className="text-[10px] text-slate-500 mt-1">{products.length} Products</span>
                      </Link>
                    )}`
);

fs.writeFileSync('src/pages/CompanyProfile.tsx', content);
console.log('patched');
