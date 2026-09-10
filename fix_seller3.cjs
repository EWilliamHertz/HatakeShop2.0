const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

// The end of the file is currently messed up.
// Let's find the closing tag for the `editingProduct` form:
const targetString = "                   submitLabel=\"Save Changes\"\n                 />\n            </div>\n          </div>\n        </div>\n      )}";

const index = code.lastIndexOf(targetString);
if (index !== -1) {
    code = code.substring(0, index + targetString.length) + "\n      </div>\n    </div>\n  );\n}\n";
    fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
}
