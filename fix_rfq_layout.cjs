const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

const targetParagraph = '         <p className="text-slate-600 mt-2">Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones.</p>\n       </div>';

// Let's just do a proper replace.
// First, we find the sidebar end.
//     </nav>\n      </div>\n
// We want to add the text at the bottom of the sidebar.
code = code.replace(
  '        </nav>\n      </div>\n\n      {/* Main Content */}\n      <div className="flex-1 space-y-8">\n         <p className="text-slate-600 mt-2">Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones.</p>\n       </div>\n',
  `        </nav>
        
        <div className="mt-8 pt-6 border-t border-slate-200">
           <p className="text-sm text-slate-500">Manage your active Requests for Quotation, negotiate bulk pricing, and track sourcing milestones.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-8">\n`
);

// We need to make sure the main content is closed at the very end properly.
// The file ends with:
//        )}
//     </div>
//   );
// }
// If we replaced `</div>` at the start of the main content, the main content is now correctly wrapping everything.
// Wait, the main content already HAS a closing `</div>` at the very end!
// Look:
//        )}
//     </div>
//   );
// }
// This matches `<div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">` which is closed by the `</div>` before the final `</div>`.
// No wait, if I removed `</div>` from `flex-1 space-y-8`, it will cause a missing closing tag unless I add one back, OR if there was an extra one at the end.
// Let's check `RFQHub.tsx` end tags.

fs.writeFileSync('src/pages/RFQHub.tsx', code);
