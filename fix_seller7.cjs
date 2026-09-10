const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

const lastIndex = code.lastIndexOf('submitLabel="Save Changes"');
code = code.substring(0, lastIndex) + 'submitLabel="Save Changes"\n                 />\n            </div>\n          </div>\n        </div>\n      )}\n    </div>\n      </div>\n    </div>\n  );\n}\n';
fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
