import 'dotenv/config';
import { db } from './src/db/index.js';
import { products, sellers, companies, users } from './src/db/schema.js';

async function main() {
  const p = await db.select().from(products).limit(5);
  console.log(p.map(x => ({ title: x.title, sellerId: x.sellerId })));
  
  const s = await db.select().from(sellers).limit(5);
  console.log(s);
  
  const c = await db.select().from(companies).limit(5);
  console.log(c);
  
  const u = await db.select().from(users).limit(5);
  console.log(u.map(x => ({ displayName: x.displayName })));
  
  process.exit(0);
}
main();
