const fs = require('fs');
let content = fs.readFileSync('src/pages/CompanySettings.tsx', 'utf-8');

// Add region and companyFocus to initial state
content = content.replace(
  "country: dbUser?.country || '',",
  "country: dbUser?.country || '',\n    region: dbUser?.region || '',\n    companyFocus: dbUser?.companyFocus || '',"
);

content = content.replace(
  "country: dbUser.country || '',",
  "country: dbUser.country || '',\n        region: dbUser.region || '',\n        companyFocus: dbUser.companyFocus || '',"
);

// Add the inputs
const oldCountryInput = `                        <div>
                          <label className="block text-sm font-semibold tracking-tight text-slate-300 mb-1.5">{t('Country')} *</label>
                          <input type="text"
                          name="country" required
                          value={formData.country} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none" />
                        </div>`;

const newInputs = `                        <div>
                          <label className="block text-sm font-semibold tracking-tight text-slate-300 mb-1.5">{t('Country')} *</label>
                          <input type="text"
                          name="country" required
                          value={formData.country} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold tracking-tight text-slate-300 mb-1.5">{t('Region (e.g. Asia, Europe)')}</label>
                          <input type="text"
                          name="region"
                          value={formData.region} onChange={handleChange}
                          placeholder="Europe"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold tracking-tight text-slate-300 mb-1.5">{t('Company Focus / Categories')}</label>
                          <input type="text"
                          name="companyFocus"
                          value={formData.companyFocus} onChange={handleChange}
                          placeholder="e.g. TCG Distributor, Grading Service, Sealed Product"
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none" />
                        </div>`;

content = content.replace(oldCountryInput, newInputs);
fs.writeFileSync('src/pages/CompanySettings.tsx', content);
