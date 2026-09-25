import 'dotenv/config';
import { db } from './src/db/index.js';
import { products, categories } from './src/db/schema.js';
import { eq, ilike, and } from 'drizzle-orm';

async function update() {
  console.log("1. Re-assigning products currently in Merchandise (24) based on their titles...");
  const merchProducts = await db.query.products.findMany({
    where: eq(products.categoryId, 24)
  });
  
  for (const p of merchProducts) {
    const title = p.title.toLowerCase();
    let newCatId = 24; // fallback
    
    if (title.includes("toploader") && title.includes("binder")) {
       newCatId = 5; // Top-Loader Binders
    } else if (title.includes("binder")) {
       newCatId = 6; // Binders
    } else if (title.includes("deck")) {
       newCatId = 10; // Deckboxes
    } else if (title.includes("toploader") || title.includes("top-loader")) {
       newCatId = 9; // Top-Loaders
    } else if (title.includes("magnetic")) {
       newCatId = 25; // Magnetic Card Holders
    } else if (title.includes("playmat")) {
       newCatId = 26; // Playmats
    } else {
       // If we can't find a match, just put it in Binders or something safe, or Top-Loaders
       console.log(`Unmatched product in Merch: ${p.title}. Defaulting to Top-Loaders (9)`);
       newCatId = 9;
    }
    
    await db.update(products).set({ categoryId: newCatId }).where(eq(products.id, p.id));
    console.log(`Moved "${p.title}" to Category ${newCatId}`);
  }
  
  console.log("2. Ensuring ALL Top-Loader Binders are in Category 5...");
  const updatedBinders = await db.update(products).set({ categoryId: 5 })
    .where(and(
       ilike(products.title, "%toploader%"),
       ilike(products.title, "%binder%")
    ))
    .returning({ id: products.id, title: products.title });
  console.log(`Moved ${updatedBinders.length} top-loader binders to Category 5.`);

  console.log("3. Making Merchandise (24)'s children roam free (parent_id = null)...");
  await db.update(categories).set({ parentId: null }).where(eq(categories.parentId, 24));
  
  console.log("4. Deleting Merchandise (24) category entirely...");
  try {
     await db.delete(categories).where(eq(categories.id, 24));
     console.log("Successfully deleted Category 24.");
  } catch(e) {
     console.error("Failed to delete Category 24 (might still have foreign key links):", e);
  }

  process.exit(0);
}

update().catch(console.error);
