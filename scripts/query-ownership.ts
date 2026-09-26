import 'dotenv/config';
import { db } from './src/db/index.js';
import { users, products } from './src/db/schema.js';

async function run() {
  const allUsers = await db.select({ id: users.id, email: users.email, teamOwnerId: users.teamOwnerId }).from(users);
  console.log("Users:", allUsers.filter(u => u.email.includes('hatake.eu')));
  
  const allProducts = await db.select({ id: products.id, sellerId: products.sellerId, title: products.title }).from(products);
  console.log("Products:", allProducts.map(p => ({ id: p.id, sellerId: p.sellerId })));
  process.exit(0);
}
run();
