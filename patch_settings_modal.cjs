const fs = require('fs');

let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

if (!code.includes('const [showApiDocsModal')) {
  code = code.replace(
    "const [activeTab, setActiveTab] = useState('personal');",
    "const [activeTab, setActiveTab] = useState('personal');\n  const [showApiDocsModal, setShowApiDocsModal] = useState(false);"
  );
}

const importX = code.includes('import {') && !code.includes('X,') ? "X," : "";
if (importX) {
  code = code.replace("import {", "import { X, Copy, ");
}

const apiModalCode = `
      {/* API Docs Modal */}
      {showApiDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApiDocsModal(false)}></div>
          <div className="relative bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Code className="w-5 h-5 text-cyan-400" /> Developer Documentation & Examples</h2>
              <button onClick={() => setShowApiDocsModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 bg-slate-900 text-slate-300">
              
              {/* GET Endpoint */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">1. Export Inventory (GET)</h3>
                <p className="text-sm">To read Hatake's current active product catalog, you can make a <code className="text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">GET</code> request to the sync endpoint. You can run this right now in your terminal to see it work:</p>
                <div className="relative group">
                  <div className="absolute right-2 top-2">
                    <button onClick={() => { navigator.clipboard.writeText('curl -X GET https://hatakeshop.vercel.app/api-v2/inventory/sync \\n  -H "Authorization: Bearer hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6"'); alert('Copied to clipboard!'); }} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors shadow-lg">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-4 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed">
{"curl -X GET https://hatakeshop.vercel.app/api-v2/inventory/sync \\\n  -H \\"Authorization: Bearer hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6\\""}
                  </pre>
                </div>
                <p className="text-xs text-slate-500 italic">(It uses the exact API key generated for you on the settings page!)</p>
              </section>

              {/* POST Endpoint */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">2. Import Products (POST)</h3>
                <p className="text-sm">To import new products dynamically (e.g. if Bokio or an ERP wants to push new stock quantities or entirely new items directly into Hatake):</p>
                <div className="relative group">
                  <div className="absolute right-2 top-2">
                    <button onClick={() => { navigator.clipboard.writeText('curl -X POST https://hatakeshop.vercel.app/api-v2/inventory/sync \\n  -H "Authorization: Bearer hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6" \\n  -H "Content-Type: application/json" \\n  -d \\'{"items":[{"title":"Imported Product via API","unitCost":25,"stockQuantity":100,"moq":1}]}\\''); alert('Copied to clipboard!'); }} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors shadow-lg">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <pre className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-4 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed">
{"curl -X POST https://hatakeshop.vercel.app/api-v2/inventory/sync \\\n  -H \\"Authorization: Bearer hk_prod_9f8c2e1b4a5d6e7f8g9h0i1j2k3l4m5n6\\" \\\n  -H \\"Content-Type: application/json\\" \\\n  -d '{\\"items\\":[{\\"title\\":\\"Imported Product via API\\",\\"unitCost\\":25,\\"stockQuantity\\":100,\\"moq\\":1}]}'"}
                  </pre>
                </div>
              </section>
              
              {/* Next Steps */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 flex items-center justify-between">
                  <span>3. Next Steps for Bokio Integration</span>
                  <button onClick={() => { navigator.clipboard.writeText("Next Steps for Bokio Integration\\n\\n- For Bokio to Hatake: You can set up a script or Zapier webhook that hits this POST endpoint every time you add a product to Bokio.\\n- For Hatake to Bokio: I can create another endpoint specifically designed to listen to Hatake's successful payments and automatically fire Bokio's proprietary journal entry REST API so your books balance instantly."); alert('Copied to clipboard!'); }} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition-colors border border-slate-700">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </h3>
                <ul className="space-y-3 text-sm list-disc pl-5">
                  <li><strong className="text-cyan-400">For Bokio to Hatake:</strong> You can set up a script or Zapier webhook that hits this <code className="text-cyan-400 bg-cyan-400/10 px-1 py-0.5 rounded text-xs">POST</code> endpoint every time you add a product to Bokio.</li>
                  <li><strong className="text-cyan-400">For Hatake to Bokio:</strong> I can create another endpoint specifically designed to listen to Hatake's successful payments and automatically fire Bokio's proprietary journal entry REST API so your books balance instantly.</li>
                </ul>
              </section>
              
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes('showApiDocsModal')) {
  code = code.replace(
    "    </div>\n  );",
    apiModalCode + "\n    </div>\n  );"
  );
  
  const viewDocsBtn = `
                 <div className="flex justify-end mb-4 mt-6">
                    <button onClick={(e) => { e.preventDefault(); setShowApiDocsModal(true); }} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center gap-2">
                       <Code className="w-5 h-5" /> View Documentation & cURL Examples
                    </button>
                 </div>
  `;
  
  code = code.replace(
    '<p className="text-slate-400 text-base max-w-2xl">Use your secure API key to automatically sync Hatake.Shop\'s live wholesale inventory directly into your Shopify, WooCommerce, or custom ERP systems.</p>\n                 </div>',
    `<p className="text-slate-400 text-base max-w-2xl">Use your secure API key to automatically sync Hatake.Shop's live wholesale inventory directly into your Shopify, WooCommerce, or custom ERP systems.</p>\n                 </div>` + viewDocsBtn
  );
}

fs.writeFileSync('src/pages/Settings.tsx', code);
