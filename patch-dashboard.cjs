const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /\{activeTab === 'sverige' && \(.*?\)\}/s,
  `{activeTab === 'sverige' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-100">Hatake Sverige B2C Toggle</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            You can now toggle any product to appear on the Swedish B2C shop directly from the <strong>Listings</strong> tab! 
            Simply go to the Listings tab, find the product, and click the "Sverige B2C" checkbox.
          </p>
        </div>
      )}`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
