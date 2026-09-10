const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

const targetStr = '                   submitLabel="Save Changes"\n                 />\n            </div>\n          </div>\n        </div>\n      )}\n    </div>      </div>\\n    </div>\\n      </div>    </div>  );\n}';

console.log(code.substring(code.length - 300));
