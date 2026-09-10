const fs = require('fs');

let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Replace the root wrapper background
layout = layout.replace(/bg-\[#fafafa\]/g, 'bg-canvas');
layout = layout.replace(/selection:bg-indigo-100 selection:text-indigo-900/g, 'selection:bg-ink selection:text-surface');

// Replace the header classes
layout = layout.replace(/<header className="[^"]*"/, '<header className="sticky top-0 z-50 border-b border-hairline bg-surface/80 backdrop-blur-md"');
layout = layout.replace(/<div className="max-w-7xl mx-auto backdrop-blur-xl bg-white\/80 border border-slate-200\/60 shadow-\[.*?\] rounded-2xl px-4 sm:px-6"/, '<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"');

// Nav items hover state
layout = layout.replace(/hover:bg-indigo-50 hover:text-indigo-700/g, 'hover:bg-surface-hover hover:text-ink');
layout = layout.replace(/text-slate-600/g, 'text-ink-light');
layout = layout.replace(/text-indigo-600/g, 'text-ink');
layout = layout.replace(/bg-indigo-600/g, 'bg-ink');
layout = layout.replace(/text-white/g, 'text-surface');

// Focus rings
layout = layout.replace(/focus:ring-indigo-500/g, 'focus:ring-ink');

// Clean up some old colors
layout = layout.replace(/bg-white/g, 'bg-surface');
layout = layout.replace(/border-slate-100/g, 'border-hairline');
layout = layout.replace(/border-slate-200/g, 'border-hairline');

fs.writeFileSync('src/components/Layout.tsx', layout);
