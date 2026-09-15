const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

const badPartIndex = code.indexOf('    </div>      </div>\\n    </div>\\n');
if (badPartIndex !== -1) {
    code = code.substring(0, badPartIndex) + "    </div>\n      </div>\n    </div>\n  );\n}\n";
    fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
    console.log("FIXED");
} else {
    console.log("NOT FOUND");
}
