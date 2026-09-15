const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldBlock = `          .from(products)
          .leftJoin(users, eq(products.sellerId, users.id))
          .where(and(eq(products.categoryId, cat.id), eq(products.approvalStatus, 'approved')))
          .orderBy(desc(products.createdAt))
          .limit(12);
        
        if (parentProds.length > 0) {
           groups.push({
              subcategory: null,
              products: parentProds
           });
        }

        const subcatsWithCounts = await Promise.all(subcats.map(async (sub) => {
           const descIds = await getDescendantCategoryIds(db, sub.id);
           const countRes = await db.select({ count: sql\`count(*)\` }).from(products).where(and(inArray(products.categoryId, descIds), eq(products.approvalStatus, 'approved')));
           const c = Number(countRes[0].count);
           
           if(c > 0) {
              const subProds = await db.select({
                product: products,
                seller: {
                  id: users.id,
                  companyName: users.companyName,
                  verificationStatus: users.verificationStatus
                }
              })
              .from(products)
              .leftJoin(users, eq(products.sellerId, users.id))
              .where(and(inArray(products.categoryId, descIds), eq(products.approvalStatus, 'approved')))
              .orderBy(desc(products.createdAt))
              .limit(12);
              
              groups.push({
                 subcategory: sub,
                 products: subProds
              });
           }
           
           return { ...sub, productCount: c };
        }));

        const filteredSubcats = subcatsWithCounts.filter(sub => sub.productCount > 0 || sub.isVisibleIfEmpty);`;

const newBlock = `          .from(products)
          .leftJoin(users, eq(products.sellerId, users.id))
          .where(and(inArray(products.categoryId, rootDescIds), eq(products.approvalStatus, 'approved')))
          .orderBy(desc(products.createdAt));

        const sellerMap = new Map();
        for (const item of parentProds) {
           if (!item.seller) continue;
           if (!sellerMap.has(item.seller.id)) {
              sellerMap.set(item.seller.id, { seller: item.seller, products: [] });
           }
           const group = sellerMap.get(item.seller.id);
           if (group.products.length < 4) { // limit to 4 per seller
              group.products.push(item);
           }
        }
        groups.push(...Array.from(sellerMap.values()));

        const subcatsWithCounts = await Promise.all(subcats.map(async (sub) => {
           const descIds = await getDescendantCategoryIds(db, sub.id);
           const countRes = await db.select({ count: sql\`count(*)\` }).from(products).where(and(inArray(products.categoryId, descIds), eq(products.approvalStatus, 'approved')));
           const c = Number(countRes[0].count);
           return { ...sub, productCount: c };
        }));

        const filteredSubcats = subcatsWithCounts.filter(sub => sub.productCount > 0 || sub.isVisibleIfEmpty);`;

if(code.includes(oldBlock)) {
    fs.writeFileSync('server.ts', code.replace(oldBlock, newBlock));
    console.log("Success");
} else {
    console.log("Failed to find exact block. Here is what we have:");
    const idx = code.indexOf('.leftJoin(users, eq(products.sellerId, users.id))');
    console.log(code.substring(idx, idx + 1000));
}
