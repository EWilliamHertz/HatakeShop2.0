const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Backgrounds
    content = content.replace(/bg-slate-50/g, 'bg-canvas');
    content = content.replace(/bg-white/g, 'bg-surface');
    content = content.replace(/bg-indigo-50/g, 'bg-surface-hover');
    
    // Text
    content = content.replace(/text-slate-900/g, 'text-ink');
    content = content.replace(/text-slate-800/g, 'text-ink');
    content = content.replace(/text-slate-700/g, 'text-ink-light');
    content = content.replace(/text-slate-600/g, 'text-ink-light');
    content = content.replace(/text-slate-500/g, 'text-ink-light');
    content = content.replace(/text-gray-900/g, 'text-ink');
    content = content.replace(/text-gray-500/g, 'text-ink-light');
    
    // Borders
    content = content.replace(/border-slate-100/g, 'border-hairline');
    content = content.replace(/border-slate-200/g, 'border-hairline');
    content = content.replace(/border-slate-300/g, 'border-hairline');
    content = content.replace(/border-gray-200/g, 'border-hairline');
    
    // Shadows -> Flat design
    content = content.replace(/shadow-sm/g, 'shadow-none');
    content = content.replace(/shadow-md/g, 'shadow-none');
    content = content.replace(/shadow-lg/g, 'shadow-none');
    content = content.replace(/shadow-xl/g, 'shadow-none');
    content = content.replace(/shadow-\[.*?\]/g, 'shadow-none');
    
    // Accents
    content = content.replace(/bg-indigo-600/g, 'bg-ink');
    content = content.replace(/hover:bg-indigo-700/g, 'hover:bg-ink-light');
    content = content.replace(/text-indigo-600/g, 'text-accent');
    content = content.replace(/text-indigo-900/g, 'text-ink');
    content = content.replace(/border-indigo-600/g, 'border-ink');
    content = content.replace(/focus:ring-indigo-500/g, 'focus:ring-ink');
    content = content.replace(/ring-indigo-500/g, 'ring-ink');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
    }
  }
});

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Catch remaining indigos and slates
    content = content.replace(/border-indigo-200/g, 'border-hairline');
    content = content.replace(/border-indigo-300/g, 'border-hairline');
    content = content.replace(/border-indigo-500/g, 'border-ink');
    content = content.replace(/bg-indigo-50/g, 'bg-surface-hover');
    content = content.replace(/bg-indigo-100/g, 'bg-surface-hover');
    content = content.replace(/text-indigo-700/g, 'text-ink');
    content = content.replace(/text-indigo-800/g, 'text-ink');
    content = content.replace(/bg-slate-100/g, 'bg-surface-hover');
    content = content.replace(/bg-gray-50/g, 'bg-canvas');
    content = content.replace(/rounded-lg/g, 'rounded-xl');
    content = content.replace(/rounded-md/g, 'rounded-lg');
    
    // Let's improve the font display classes
    content = content.replace(/font-extrabold/g, 'font-semibold tracking-tight font-display');
    content = content.replace(/font-bold/g, 'font-semibold tracking-tight');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
    }
  }
});
