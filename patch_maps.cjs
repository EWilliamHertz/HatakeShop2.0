const fs = require('fs');

function patchAdminListings() {
    let code = fs.readFileSync('src/components/AdminListings.tsx', 'utf8');
    // Protect categoriesData
    code = code.replace(/\{categoriesData\.map/g, "{Array.isArray(categoriesData) && categoriesData.map");
    // Protect p.categoryIds
    code = code.replace(/\{p\.categoryIds && p\.categoryIds\.length > 0 \?/g, "{Array.isArray(p.categoryIds) && p.categoryIds.length > 0 ?");
    // Protect filteredProducts
    code = code.replace(/\{filteredProducts\.map/g, "{Array.isArray(filteredProducts) && filteredProducts.map");
    
    fs.writeFileSync('src/components/AdminListings.tsx', code);
    console.log("Patched AdminListings.tsx");
}

function patchMarketplace() {
    let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf8');
    code = code.replace(/\{categoryTree\.map/g, "{Array.isArray(categoryTree) && categoryTree.map");
    code = code.replace(/\{parent\.children\.map/g, "{Array.isArray(parent.children) && parent.children.map");
    code = code.replace(/\{groupedProducts\.companies\.map/g, "{Array.isArray(groupedProducts.companies) && groupedProducts.companies.map");
    fs.writeFileSync('src/pages/Marketplace.tsx', code);
    console.log("Patched Marketplace.tsx");
}

patchAdminListings();
patchMarketplace();
