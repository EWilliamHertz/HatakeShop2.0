const fs = require('fs');

// Storefront
let storefront = fs.readFileSync('src/pages/Storefront.tsx', 'utf8');
if (!storefront.includes('VendorReviews')) {
  storefront = storefront.replace(
    "import { MapPin, ShieldCheck, Box, Info } from 'lucide-react';",
    "import { MapPin, ShieldCheck, Box, Info } from 'lucide-react';\nimport { VendorReviews } from '../components/VendorReviews.tsx';"
  );
  storefront = storefront.replace(
    /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*}\s*$/m,
    "            </div>\n            <VendorReviews vendorId={store.id} />\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n}\n"
  );
  fs.writeFileSync('src/pages/Storefront.tsx', storefront);
}

// CompanyProfile
let companyProfile = fs.readFileSync('src/pages/CompanyProfile.tsx', 'utf8');
if (!companyProfile.includes('VendorReviews')) {
  companyProfile = companyProfile.replace(
    "import { Maximize2 } from 'lucide-react';",
    "import { Maximize2 } from 'lucide-react';\nimport { VendorReviews } from '../components/VendorReviews.tsx';"
  );
  
  // Inject at the bottom of the right column
  companyProfile = companyProfile.replace(
    /<\/div>\s*<\/div>\s*<\/div>\s*<SpotlightGallery/m,
    "            </div>\n            <VendorReviews vendorId={company.id} />\n          </div>\n        </div>\n      </div>\n      <SpotlightGallery"
  );
  fs.writeFileSync('src/pages/CompanyProfile.tsx', companyProfile);
}

