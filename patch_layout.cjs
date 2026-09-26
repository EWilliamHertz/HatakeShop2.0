const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

const searchBtn = `
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors mr-2 text-sm"
              >
                <Search className="w-4 h-4" />
                <span>Quick Search</span>
                <kbd className="ml-2 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px] uppercase text-slate-500">Cmd K</kbd>
              </button>
`;

if (!code.includes('open-command-palette')) {
  code = code.replace(
    '<div className="hidden md:flex items-center space-x-4">',
    '<div className="hidden md:flex items-center space-x-4">\n' + searchBtn
  );
  fs.writeFileSync('src/components/Layout.tsx', code);
}
