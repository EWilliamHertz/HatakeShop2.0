const fs = require('fs');

let seller = fs.readFileSync('src/routes/seller.ts', 'utf-8');

seller = seller.replace(
  /categoryId: categoryId \|\| null,/g,
  'categoryId: categoryId || null,\n      approvalStatus: userProfile.role === "admin" ? "approved" : "pending",'
);

fs.writeFileSync('src/routes/seller.ts', seller);
console.log("Patched both correctly");
