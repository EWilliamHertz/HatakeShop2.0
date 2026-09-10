import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { users, products } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const ernst = await db.select().from(users).where(eq(users.email, 'ernst@hatake.eu')).limit(1);
    if (!ernst || ernst.length === 0) {
      console.log("Ernst not found");
      process.exit(1);
    }
    const ernstId = ernst[0].id;

    console.log("Fetching from production...");
    const res = await fetch('https://hatake.shop/api/products?limit=100');
    const data = await res.json();
    
    const prodList = data.products || [];
    console.log(`Found ${prodList.length} products to import.`);

    for (const p of prodList) {
      const prod = p.product;
      if (prod.title === 'General Inquiry') continue;
      
      await db.insert(products).values({
        sellerId: ernstId,
        title: prod.title,
        brand: prod.brand,
        description: prod.description,
        moq: prod.moq || 1,
        unitCost: prod.unitCost || "0",
        images: prod.images || [],
        productType: prod.productType || 'sealed',
        originType: prod.originType || 'Direct Factory', leadTimeDays: prod.leadTimeDays || 1
      });
      console.log(`Imported: ${prod.title}`);
    }
    console.log("Done importing products from production.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
