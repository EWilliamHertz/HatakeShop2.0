const fs = require('fs');
let code = fs.readFileSync('src/pages/CompanySettings.tsx', 'utf8');

// Add notificationEmails to state
code = code.replace(/kybDocuments: dbUser\?\.kybDocuments \|\| \[\],/g, "kybDocuments: dbUser?.kybDocuments || [],\n    notificationEmails: dbUser?.notificationEmails || [],");
code = code.replace(/region: dbUser\.region \|\| '',/g, "region: dbUser.region || '',\n        notificationEmails: dbUser.notificationEmails || [],");

// Add Bell to lucide-react imports if not there
if (!code.includes('Bell')) {
  code = code.replace(/import \{ (.*?) \} from 'lucide-react';/, "import { $1, Bell, X, Plus } from 'lucide-react';");
}

// Add Notifications tab
code = code.replace(/\{ id: 'logistics', name: 'Logistics & Payments', icon: MapPin \},/g, "{ id: 'logistics', name: 'Logistics & Payments', icon: MapPin },\n    { id: 'notifications', name: 'Notifications', icon: Bell },");

// Add Notifications Tab Content
const notifTab = `
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">{t('Notification Emails')}</h2>
                      <p className="text-sm text-slate-400 mb-6">{t('Add up to 5 email addresses to receive important notifications like leads, orders, and inquiries.')}</p>
                      
                      <div className="space-y-3">
                        {formData.notificationEmails.map((email: string, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="email" 
                              value={email}
                              onChange={(e) => {
                                const newEmails = [...formData.notificationEmails];
                                newEmails[idx] = e.target.value;
                                setFormData({ ...formData, notificationEmails: newEmails });
                              }}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                              placeholder={t('team@yourcompany.com')}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newEmails = formData.notificationEmails.filter((_: string, i: number) => i !== idx);
                                setFormData({ ...formData, notificationEmails: newEmails });
                              }}
                              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-700 rounded-xl transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        
                        {formData.notificationEmails.length < 5 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, notificationEmails: [...formData.notificationEmails, ''] });
                            }}
                            className="flex items-center gap-2 text-sm text-cyan-400 font-semibold hover:text-cyan-300 transition-colors"
                          >
                            <Plus className="w-4 h-4" /> {t('Add Email')} ({formData.notificationEmails.length}/5)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
`;

code = code.replace(/\{activeTab === 'logistics' && \(/g, notifTab.trim() + "\n                {activeTab === 'logistics' && (");

fs.writeFileSync('src/pages/CompanySettings.tsx', code);
console.log('CompanySettings.tsx patched');
