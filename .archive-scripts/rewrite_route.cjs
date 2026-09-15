const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const routeStart = 'app.get("/api/marketplace/sneak-peek"';
const routeEnd = 'app.get("/api/products"';

const p1 = code.indexOf(routeStart);
const p2 = code.indexOf(routeEnd);

const before = code.substring(0, p1);
const after = code.substring(p2);

const newRoute = `app.get("/api/marketplace/sneak-peek", async (req, res) => {
    try {
      const topCategories = await db.select().from(categories).where(sql\`parent_id IS NULL\`).orderBy(categories.sortOrder);
      const result = [];
      for (const cat of topCategories) {
        const subcats = await db.select().from(categories).where(eq(categories.parentId, cat.id)).orderBy(categories.sortOrder);
        
        const rootDescIds = await getDescendantCategoryIds(db, cat.id);
        const rootCountRes = await db.select({ count: sql\`count(*)\` }).from(products).where(and(inArray(products.categoryId, rootDescIds), eq(products.approvalStatus, 'approved')));
        const totalProducts = Number(rootCountRes[0].count);
        
        if (totalProducts === 0 && !cat.isVisibleIfEmpty) {
          continue;
        }
        
        const allProdsQuery = await db.select({
            product: products,
            seller: {
              id: users.id,
              companyName: users.companyName,
              verificationStatus: users.verificationStatus
            }
          })
          .from(products)
          .leftJoin(users, eq(products.sellerId, users.id))
          .where(and(inArray(products.categoryId, rootDescIds), eq(products.approvalStatus, 'approved')))
          .orderBy(desc(products.createdAt));

        const sellerMap = new Map();
        for (const item of allProdsQuery) {
           if (!item.seller) continue;
           if (!sellerMap.has(item.seller.id)) {
              sellerMap.set(item.seller.id, { seller: item.seller, products: [] });
           }
           const group = sellerMap.get(item.seller.id);
           if (group.products.length < 4) { // Limit to 4 per seller
              group.products.push(item);
           }
        }
        const groups = Array.from(sellerMap.values());

        const subcatsWithCounts = await Promise.all(subcats.map(async (sub) => {
           const descIds = await getDescendantCategoryIds(db, sub.id);
           const countRes = await db.select({ count: sql\`count(*)\` }).from(products).where(and(inArray(products.categoryId, descIds), eq(products.approvalStatus, 'approved')));
           const c = Number(countRes[0].count);
           return { ...sub, productCount: c };
        }));

        const filteredSubcats = subcatsWithCounts.filter(sub => sub.productCount > 0 || sub.isVisibleIfEmpty);
        
        result.push({
          category: cat,
          subcategories: filteredSubcats,
          groups: groups
        });
      }
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  `;

fs.writeFileSync('server.ts', before + newRoute + after);
console.log('Route replaced!');
