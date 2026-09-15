const fs = require('fs');
let content = fs.readFileSync('src/pages/CompanySettings.tsx', 'utf-8');

const oldCountry = `<select
                          name="country" required
                          value={formData.country} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">{t('Select Country')}</option>
                          <option value="US">{t('United States')}</option>
                          <option value="GB">{t('United Kingdom')}</option>
                          <option value="EU">{t('European Union')}</option>
                          <option value="JP">{t('Japan')}</option>
                          <option value="CN">{t('China')}</option>
                          <option value="OTHER">{t('Other')}</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex flex-col">`;

const newFields = `<select
                          name="country" required
                          value={formData.country} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">{t('Select Country')}</option>
                          <option value="Sweden">{t('Sweden')}</option>
                          <option value="United States">{t('United States')}</option>
                          <option value="United Kingdom">{t('United Kingdom')}</option>
                          <option value="Japan">{t('Japan')}</option>
                          <option value="China">{t('China')}</option>
                          <option value="Other">{t('Other')}</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-semibold tracking-tight text-slate-300">{t('Region')}</label>
                        <select
                          name="region" required
                          value={formData.region} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">{t('Select Region')}</option>
                          <option value="Europe">{t('Europe')}</option>
                          <option value="North America">{t('North America')}</option>
                          <option value="Asia">{t('Asia')}</option>
                          <option value="Global">{t('Global')}</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex flex-col md:col-span-2">
                        <label className="text-sm font-semibold tracking-tight text-slate-300">{t('Company Focus')}</label>
                        <input
                          type="text" required
                          name="companyFocus" placeholder="e.g. TCG Distributor, Grading Service, Singles Vendor"
                          value={formData.companyFocus} onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div className="space-y-2 flex flex-col">`;

if (content.includes(oldCountry)) {
  content = content.replace(oldCountry, newFields);
  fs.writeFileSync('src/pages/CompanySettings.tsx', content);
  console.log("Patched successfully");
} else {
  console.log("Could not find country block");
}
