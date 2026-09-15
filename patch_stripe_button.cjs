const fs = require('fs');
let content = fs.readFileSync('src/pages/CompanySettings.tsx', 'utf-8');

const oldButton = `<button type="button" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all px-4 py-2.5">
                          {formData.stripeAccountId ? t('Manage') : t('Connect Stripe')}
                        </button>`;

const newButton = `<button type="button" onClick={async () => {
                          try {
                            const token = await user?.getIdToken();
                            const res = await fetch('/api-v2/stripe/create-account', { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` } });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                            else alert("Failed to connect stripe: " + (data.error || 'Unknown Error'));
                          } catch (e: any) { alert(e.message); }
                        }} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all px-4 py-2.5">
                          {formData.stripeAccountId ? t('Manage') : t('Connect Stripe')}
                        </button>`;

if (content.includes(oldButton)) {
  content = content.replace(oldButton, newButton);
  fs.writeFileSync('src/pages/CompanySettings.tsx', content);
  console.log("Patched Stripe successfully");
} else {
  console.log("Could not find Stripe button");
}
