const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `         const availableProducts = await db.select().from(products)
           .where(and(...conditions))
           .limit(50);`;

const newLogic = `         const availableProducts = await db.select({
             product: products,
             seller: { companyName: users.companyName }
           })
           .from(products)
           .leftJoin(users, eq(products.sellerId, users.id))
           .where(and(...conditions))
           .limit(50);`;

const oldFor = `         for (const p of shuffled) {
            const price = Number(p.unitCost);
            const moq = p.moq || 1;
            if (price > 0 && (price * moq) <= remainingBudget) {
               // Recommend a sensible quantity
               const affordableQty = Math.floor(remainingBudget / price);
               const take = Math.min(affordableQty, p.stockQuantity || 10, moq * 5); // Don't take all stock, take up to 5x MOQ
               if (take >= moq) {
                  cartItems.push({ product: p, quantity: take });
                  remainingBudget -= (take * price);
               }
            }`;

const newFor = `         for (const row of shuffled) {
            const p = row.product;
            const price = Number(p.unitCost);
            const moq = p.moq || 1;
            if (price > 0 && (price * moq) <= remainingBudget) {
               // Recommend a sensible quantity
               const affordableQty = Math.floor(remainingBudget / price);
               const take = Math.min(affordableQty, p.stockQuantity || 10, moq * 5); // Don't take all stock, take up to 5x MOQ
               if (take >= moq) {
                  cartItems.push({ product: { ...p, seller: row.seller }, quantity: take });
                  remainingBudget -= (take * price);
               }
            }`;

code = code.replace(oldLogic, newLogic);
code = code.replace(oldFor, newFor);
fs.writeFileSync('server.ts', code);
