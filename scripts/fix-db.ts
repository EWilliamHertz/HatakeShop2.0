import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './src/db/schema.ts';

const { Pool } = pkg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  await db.execute(sql`UPDATE users SET company_name = 'TopBestPKG' WHERE id = 1`);
  await db.execute(sql`UPDATE users SET company_name = 'StarPacks' WHERE id = 171`);
  const res = await db.execute(sql`SELECT id, email, company_name FROM users`);
  console.table(res.rows);
  process.exit(0);
}
run();
