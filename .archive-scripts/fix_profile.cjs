const fs = require('fs');
let companyProfile = fs.readFileSync('src/pages/CompanyProfile.tsx', 'utf8');

// The original pattern was probably:
//             </div>
//           </div>
//         </div>
//       </div>
//       <SpotlightGallery

// I replaced 3 divs with 4. Let's find exactly the spot.
// Searching for "<VendorReviews vendorId={company.id} />" and the divs around it.

companyProfile = companyProfile.replace(
  "            <VendorReviews vendorId={company.id} />\n          </div>\n        </div>\n      </div>\n      <SpotlightGallery",
  "            <VendorReviews vendorId={company.id} />\n          </div>\n        </div>\n      <SpotlightGallery"
);

fs.writeFileSync('src/pages/CompanyProfile.tsx', companyProfile);
