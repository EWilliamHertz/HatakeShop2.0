import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { users, products } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function seed() {
  const uid = 'uJjvZKedn0MBrz75w6bd9Az8P0H3';
  const existingUser = await db.select().from(users).where(eq(users.uid, uid));
  let userId;
  if (existingUser.length > 0) {
    userId = existingUser[0].id;
  } else {
    process.exit(1);
  }

  const seedProducts = [
    {
      sellerId: userId,
      title: "One Piece Card Game: Romance Dawn Booster Box (OP-01)",
      description: "Factory sealed booster box of the first One Piece TCG set. Extremely high demand. 24 packs per box.",
      moq: 10,
      stockQuantity: 500,
      unitCost: "250.00",
      originType: "warehouse",
      leadTimeDays: 2,
      images: ["https://images.unsplash.com/photo-1620336655055-088d06e36bf0?w=800&q=80"],
      approvalStatus: "approved",
      brand: "Bandai",
      tieredPricing: { "10+": 250.0, "50+": 235.0, "100+": 220.0 }
    },
    {
      sellerId: userId,
      title: "Pokemon TCG: 151 Ultra Premium Collection",
      description: "The highly sought after Scarlet & Violet 151 UPC. Includes 16 booster packs, metal cards, and exclusive promos.",
      moq: 20,
      stockQuantity: 1000,
      unitCost: "110.00",
      originType: "warehouse",
      leadTimeDays: 3,
      images: ["https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=800&q=80"],
      approvalStatus: "approved",
      brand: "Pokemon",
      tieredPricing: { "20+": 110.0, "100+": 102.0, "500+": 95.0 }
    },
    {
      sellerId: userId,
      title: "Premium White-Label Magnetic Card Holders (35pt)",
      description: "High-quality acrylic magnetic card holders with UV protection. Perfect for B2B redistribution or grading submissions. Unbranded.",
      moq: 1000,
      stockQuantity: 50000,
      unitCost: "1.25",
      originType: "manufacturer",
      leadTimeDays: 14,
      images: ["https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=800&q=80"],
      approvalStatus: "approved",
      brand: "Unbranded",
      tieredPricing: { "1000+": 1.25, "5000+": 0.95, "20000+": 0.75 }
    }
  ];

  for (const p of seedProducts) {
    await db.insert(products).values(p);
  }
  console.log('Inserted products');
  process.exit(0);
}

seed().catch(console.error);
