const fs = require('fs');

let route = fs.readFileSync('src/routes/products.ts', 'utf8');
if (!route.includes('isSponsored: products.isSponsored')) {
    route = route.replace(
      /categoryIds: products\.categoryIds,/,
      "categoryIds: products.categoryIds,\n          isSponsored: products.isSponsored,"
    );
    fs.writeFileSync('src/routes/products.ts', route);
    console.log("Patched products.ts with isSponsored");
} else {
    console.log("Already has isSponsored in products.ts");
}

let adminRoute = fs.readFileSync('src/routes/admin.ts', 'utf8');
if (!adminRoute.includes('isSponsored: products.isSponsored') && adminRoute.includes('categoryIds: products.categoryIds')) {
    // Wait, adminRoute /api-v2/admin/products does a full select: db.select({ product: products, seller: users })
    // So it already has product.isSponsored
}
if (!adminRoute.includes('updates.isSponsored !== undefined')) {
    adminRoute = adminRoute.replace(
      /if \(updates\.categoryIds !== undefined\) updateData\.categoryIds = updates\.categoryIds;/,
      "if (updates.categoryIds !== undefined) updateData.categoryIds = updates.categoryIds;\n    if (updates.isSponsored !== undefined) updateData.isSponsored = updates.isSponsored;"
    );
    fs.writeFileSync('src/routes/admin.ts', adminRoute);
    console.log("Patched admin.ts with bulk isSponsored");
}
