const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf-8');

const originalQuoteBlock = `{m.text && (
                             <div className={\`p-3 rounded-lg text-sm \${isMe ? 'bg-slate-800/80 text-white' : 'bg-slate-800 text-white'}\`}>
                               {m.text}
                             </div>
                           )}`;
                           
const newQuoteBlock = `{m.text && (
                             <div 
                               className={\`group relative p-3 rounded-lg text-sm \${isMe ? 'bg-slate-800/80 text-white' : 'bg-slate-800 text-white'}\`}
                               title={m.originalText ? 'Original: ' + m.originalText : undefined}
                             >
                               {m.text}
                               {m.originalText && (
                                 <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-slate-300 text-xs p-2 rounded border border-slate-700 shadow-xl -top-10 left-0 pointer-events-none z-50 w-max max-w-xs break-words">
                                   <span className="text-cyan-400 font-bold block mb-1">Original Text</span>
                                   {m.originalText}
                                 </div>
                               )}
                             </div>
                           )}`;

const originalTextBlock = `<div className={\`p-3 rounded-2xl text-sm \${isMe ? 'bg-cyan-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}\`}>
                        {m.text}
                      </div>`;
                      
const newTextBlock = `<div 
                        className={\`group relative p-3 rounded-2xl text-sm \${isMe ? 'bg-cyan-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm'}\`}
                        title={m.originalText ? 'Original: ' + m.originalText : undefined}
                      >
                        {m.text}
                        {m.originalText && (
                          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-slate-300 text-xs p-2 rounded border border-slate-700 shadow-xl -top-10 left-0 pointer-events-none z-50 w-max max-w-xs break-words">
                            <span className="text-cyan-400 font-bold block mb-1">Original Text</span>
                            {m.originalText}
                          </div>
                        )}
                      </div>`;

code = code.replace(originalQuoteBlock, newQuoteBlock);
code = code.replace(originalTextBlock, newTextBlock);

fs.writeFileSync('src/pages/RFQDetails.tsx', code);
