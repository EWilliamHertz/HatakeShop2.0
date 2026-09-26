import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './src/db/schema.ts';

const { Pool } = pkg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const res = await db.execute(sql`SELECT id, email, company_name FROM users`);
  console.log('Users:');
  console.table(res.rows);
  const prod = await db.execute(sql`SELECT id, title, seller_id FROM products ORDER BY id ASC LIMIT 50`);
  console.log('Products:');
  console.table(prod.rows);
  process.exit(0);
}
run();
