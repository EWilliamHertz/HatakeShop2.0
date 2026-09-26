const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const bokioDocs = `
              {/* Bokio Sync Endpoint */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">3. Trigger Bokio Accounting Sync (POST)</h3>
                <p className="text-sm">To manually trigger Hatake to compile a paid order and push it to Bokio's REST API as a balanced journal entry:</p>
                <div className="relative group">
                  <div className="absolute right-2 top-2">
                    <button onClick={() => { navigator.clipboard.writeText('curl -X POST https://hatakeshop.vercel.app/api-v2/webhook/bokio-test \\n  -H "Authorization: Bearer hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6"'); alert('Copied to clipboard!'); }} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors shadow-lg">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-4 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed">
{"curl -X POST https://hatakeshop.vercel.app/api-v2/webhook/bokio-test \\\n  -H \\"Authorization: Bearer hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6\\""}
                  </pre>
                </div>
              </section>
`;

if (!code.includes('Trigger Bokio Accounting Sync')) {
  code = code.replace(
    '{/* Next Steps */}',
    bokioDocs + '\n              {/* Next Steps */}'
  );
  
  // Fix numbering on next steps
  code = code.replace(
    '<span>3. Next Steps for Bokio Integration</span>',
    '<span>4. Next Steps for Bokio Integration</span>'
  );
  
  fs.writeFileSync('src/pages/Settings.tsx', code);
}
