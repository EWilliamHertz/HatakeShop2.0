import { db } from './src/db/index.ts';
import { users, products, inquiries, inquiryMessages } from './src/db/schema.ts';
import { sql } from 'drizzle-orm';

async function main() {
  const cUsers = await db.select({ count: sql`count(*)` }).from(users);
  const cProducts = await db.select({ count: sql`count(*)` }).from(products);
  const cInquiries = await db.select({ count: sql`count(*)` }).from(inquiries);
  const cMessages = await db.select({ count: sql`count(*)` }).from(inquiryMessages);
  
  console.log('Users:', cUsers[0].count);
  console.log('Products:', cProducts[0].count);
  console.log('Inquiries:', cInquiries[0].count);
  console.log('Messages:', cMessages[0].count);
}
main().catch(console.error);
