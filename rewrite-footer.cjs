const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

const oldFooterStart = '<footer className="mt-auto';
const oldFooterEnd = '</footer>';

const startIndex = code.indexOf(oldFooterStart);
const endIndex = code.indexOf(oldFooterEnd, startIndex) + oldFooterEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newFooter = `<footer className="mt-auto bg-slate-950 border-t border-slate-800 py-8 text-sm relative">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <div className="flex items-center justify-center md:justify-start gap-4">
            <CurrencySelector />
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-transparent text-slate-400 hover:text-white font-medium outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="sv">Svenska</option>
            </select>
          </div>

          <div className="text-center">
            <p className="font-semibold text-slate-300">&copy; {new Date().getFullYear()} Hatake.Shop. {t('All rights reserved.')}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{t('International Wholesale B2B')}</p>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <button onClick={() => setFeedbackOpen(true)} className="flex items-center space-x-2 text-slate-400 hover:text-cyan-400 font-semibold transition-colors">
              <span>{t('Report Bug / Feedback')}</span>
            </button>
          </div>
          
        </div>
      </footer>`;

  code = code.slice(0, startIndex) + newFooter + code.slice(endIndex);
  fs.writeFileSync('src/components/Layout.tsx', code);
}
