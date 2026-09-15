const fs = require('fs');
let content = fs.readFileSync('src/pages/Suppliers.tsx', 'utf-8');

const oldReturn = `              <div className="flex items-center text-sm font-medium text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> {partner.location || 'Global'}
              </div>
            </Wrapper>
          )})}`;

const newReturn = `              <div className="flex items-center text-sm font-medium text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> {partner.location || 'Global'}
              </div>
              {partner.id && (
                <div className="mt-4 text-cyan-400 text-sm font-semibold group-hover:text-cyan-300 flex items-center">
                  View Profile <span className="ml-1">→</span>
                </div>
              )}
            </Wrapper>
          )})}`;

content = content.replace(oldReturn, newReturn);
fs.writeFileSync('src/pages/Suppliers.tsx', content);
