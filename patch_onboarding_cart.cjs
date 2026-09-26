const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `{
  "role": "retailer" | "distributor" | "collector" | "investor" | "other",
  "interests": ["Pokemon", "One Piece", "Naruto", "Dragon Ball", "Disney Lorcana", "Yu-Gi-Oh", "Magic", "Flesh and Blood", "Union Arena", "Weiss Schwarz"],
  "languages": ["English", "Japanese", "zh-Hans", "zh-Hant"],
  "buyScale": "single_cases" | "pallets" | "containers" | "unknown"
}
If they don't mention something explicitly, try to infer the best fit from their text (e.g. "I retail locally" -> role: "retailer"). If you can't guess, use "unknown" or empty arrays.`;

const newPrompt = `{
  "role": "retailer" | "distributor" | "collector" | "investor" | "other",
  "interests": ["Pokemon", "One Piece", "Naruto", "Dragon Ball", "Disney Lorcana", "Yu-Gi-Oh", "Magic", "Flesh and Blood", "Union Arena", "Weiss Schwarz"],
  "languages": ["English", "Japanese", "zh-Hans", "zh-Hant"],
  "buyScale": "single_cases" | "pallets" | "containers" | "unknown",
  "wantsCart": true | false,
  "cartBudget": number | null
}
If they don't mention something explicitly, try to infer the best fit. If you can't guess, use "unknown" or empty arrays.
CRITICAL: If the user explicitly asks you to build, create, or recommend a cart/RFQ (e.g., for a specific amount like 350), set "wantsCart" to true and extract the number into "cartBudget".`;

code = code.replace(oldPrompt, newPrompt);

const oldLogic = `    const json = JSON.parse(cleaned || "{}");
    res.json(json);`;

const newLogic = `    const json = JSON.parse(cleaned || "{}");
    
    // Auto-generate cart if requested
    if (json.wantsCart && json.cartBudget > 0) {
       try {
         let conditions = [eq(products.approvalStatus, 'approved')];
         if (json.interests && json.interests.length > 0) {
            conditions.push(inArray(products.brand, json.interests));
         }
         const availableProducts = await db.select().from(products)
           .where(and(...conditions))
           .limit(50);
           
         let remainingBudget = json.cartBudget;
         let cartItems = [];
         
         // Shuffle available products slightly for variety
         const shuffled = availableProducts.sort(() => Math.random() - 0.5);
         
         for (const p of shuffled) {
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
            }
            if (remainingBudget <= (json.cartBudget * 0.05)) break; // Stop if we used 95% of budget
         }
         json.cartItems = cartItems;
       } catch (dbErr) {
         console.error("Failed to build auto-cart:", dbErr);
       }
    }

    res.json(json);`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('server.ts', code);
