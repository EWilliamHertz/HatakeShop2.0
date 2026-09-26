import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './src/db/schema.ts';

async function run() {
  const pool = new pg.Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: 'cloud_sql_production_database',
  });
  const db = drizzle(pool, { schema });

  const tableNames = ['users', 'categories', 'products', 'inquiries', 'inquiryMessages', 'leads', 'marketing_logs', 'affiliates', 'reviews', 'feedback'];
  const tables = [schema.users, schema.categories, schema.products, schema.inquiries, schema.inquiryMessages, schema.leads, schema.marketing_logs, schema.affiliates, schema.reviews, schema.feedback];
  
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
