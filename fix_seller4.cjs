const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

const regex = /submitLabel="Save Changes"[\s\S]*?\/>\s*<\/div>\s*<\/div>\s*<\/div>\s*}\)/;
const match = code.match(regex);
if (match) {
    const replacement = match[0] + "\n        </div>\n      </div>\n    </div>\n  );\n}\n";
    code = code.substring(0, match.index) + replacement;
    fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
} else {
    console.log("NOT FOUND");
}
