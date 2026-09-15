const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanySettings.tsx', 'utf-8');

// Add to formData
code = code.replace(
  `shippingZip: dbUser?.shippingZip || '',`,
  `shippingZip: dbUser?.shippingZip || '',\n    restrictedShippingCountries: dbUser?.restrictedShippingCountries || [],`
);

// Add to reset logic in useEffect
code = code.replace(
  `shippingZip: dbUser.shippingZip || '',`,
  `shippingZip: dbUser.shippingZip || '',\n        restrictedShippingCountries: dbUser.restrictedShippingCountries || [],`
);

// Add UI input
const uiReplacement = `                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-semibold tracking-tight text-slate-300">{t('Postal / Zip Code')}</label>
                        <input type="text" name="shippingZip" value={formData.shippingZip} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                      </div>
                      <div className="space-y-2 md:col-span-2 mt-4">
                        <label className="text-sm font-semibold tracking-tight text-slate-300">{t('Restricted Shipping Countries (Comma-separated)')}</label>
                        <input 
                          type="text" 
                          placeholder="e.g. North Korea, Iran, Russia"
                          value={Array.isArray(formData.restrictedShippingCountries) ? formData.restrictedShippingCountries.join(', ') : formData.restrictedShippingCountries} 
                          onChange={(e) => setFormData({...formData, restrictedShippingCountries: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} 
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" 
                        />
                        <p className="text-xs text-slate-500 mt-1">Customers from these countries will not be able to order your products.</p>
                      </div>`;

code = code.replace(
  `                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-semibold tracking-tight text-slate-300">{t('Postal / Zip Code')}</label>
                        <input type="text" name="shippingZip" value={formData.shippingZip} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                      </div>`,
  uiReplacement
);

fs.writeFileSync('src/pages/CompanySettings.tsx', code);
console.log("Patched CompanySettings.tsx");
