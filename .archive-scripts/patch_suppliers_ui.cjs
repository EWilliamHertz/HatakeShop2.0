const fs = require('fs');
let content = fs.readFileSync('src/pages/Suppliers.tsx', 'utf-8');

const oldBlock = `<div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform border border-slate-700 group-hover:bg-cyan-500 group-hover:text-slate-900">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5 mb-2">
                {partner.name}
                {partner.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 text-cyan-500 shrink-0" title="Verified" />}
                {partner.verificationStatus === 'audited' && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Audited" />}
              </h3>
              
              <div className="mb-3">
                {partner.signedUp || !partner.isLeadOnly ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Joined')}</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Invited')}</span>
                )}
              </div>
              <div className="flex items-center text-sm font-medium text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> {partner.location || 'Global'}
              </div>
              {partner.id && (
                <div className="mt-4 text-cyan-400 text-sm font-semibold group-hover:text-cyan-300 flex items-center">
                  View Profile <span className="ml-1">→</span>
                </div>
              )}`;

const newBlock = `{partner.profilePictureUrl ? (
                <img src={partner.profilePictureUrl} alt={partner.name} className="w-16 h-16 rounded-full object-cover mb-4 group-hover:scale-110 transition-transform border border-slate-700 shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform border border-slate-700 group-hover:bg-cyan-500 group-hover:text-slate-900">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <h3 className="text-lg font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5 mb-2">
                {partner.name}
                {partner.verificationStatus === 'verified' && <BadgeCheck className="w-4 h-4 text-cyan-500 shrink-0" title="Verified" />}
                {partner.verificationStatus === 'audited' && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Audited" />}
              </h3>
              
              <div className="mb-3">
                {partner.signedUp || !partner.isLeadOnly ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Joined')}</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-semibold tracking-tight uppercase">{t('Invited')}</span>
                )}
              </div>
              
              <div className="flex flex-col items-center justify-center text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-700 w-full mb-2">
                <div className="flex flex-col items-center text-slate-200 text-center">
                  <span className="uppercase tracking-wider text-xs font-bold flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-cyan-500 shrink-0" /> 
                    {partner.location || 'GLOBAL'}{partner.region ? ',' : ''}
                  </span>
                  {partner.region && (
                    <span className="uppercase tracking-widest text-xs font-semibold text-slate-400 mt-0.5">
                      {partner.region}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full mt-auto pt-4 border-t border-slate-700/50 flex flex-col space-y-2 text-left">
                 <div className="flex flex-col">
                   <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{t('Focus')}</span>
                   <span className="text-sm font-medium text-slate-300">{partner.companyFocus || t('Trading Cards & Games')}</span>
                 </div>
                 <div className="flex justify-between items-center mt-2">
                   <div className="flex flex-col">
                     <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{t('Platform Sales')}</span>
                     <span className="text-xs font-semibold text-emerald-400">TBD</span>
                   </div>
                   {partner.id && (
                     <div className="text-cyan-400 text-sm font-bold group-hover:text-cyan-300 flex items-center">
                       {t('Profile')} <span className="ml-1">→</span>
                     </div>
                   )}
                 </div>
              </div>`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/pages/Suppliers.tsx', content);
