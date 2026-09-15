const fs = require('fs');

let seller = fs.readFileSync('src/routes/seller.ts', 'utf-8');

// Patch bulk upload
seller = seller.replace(
  'categoryId: categoryId || null,',
  'categoryId: categoryId || null,\n        approvalStatus: userProfile.role === "admin" ? "approved" : "pending",'
);

fs.writeFileSync('src/routes/seller.ts', seller);
console.log("Patched bulk approval status");
