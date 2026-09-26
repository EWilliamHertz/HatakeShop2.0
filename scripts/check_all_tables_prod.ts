import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';
import { users, categories, products, inquiries, inquiryMessages, leads, marketing_logs, affiliates, reviews, feedback } from './src/db/schema.ts';

async function run() {
  const tableNames = ['users', 'categories', 'products', 'inquiries', 'inquiryMessages', 'leads', 'marketing_logs', 'affiliates', 'reviews', 'feedback'];
  const tables = [users, categories, products, inquiries, inquiryMessages, leads, marketing_logs, affiliates, reviews, feedback];
  for (let i = 0; i < tables.length; i++) {
    try {
      await db.select().from(tables[i]).limit(1);
      console.log(`OK: ${tableNames[i]}`);
    } catch(e) {
      console.log(`ERROR on ${tableNames[i]}: ${e.message}`);
    }
  }
  process.exit(0);
}
run();
