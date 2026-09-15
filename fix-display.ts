import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './src/db/schema.ts';

const { Pool } = pkg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  await db.execute(sql`UPDATE users SET display_name = 'Phoebe' WHERE id = 1`);
  await db.execute(sql`UPDATE users SET display_name = 'StarPacks Admin' WHERE id = 171`);
  await db.execute(sql`UPDATE users SET display_name = 'Stefan' WHERE id = 2`);
  await db.execute(sql`UPDATE users SET display_name = 'Zudran' WHERE id = 122`);
  await db.execute(sql`UPDATE users SET display_name = 'Ernst' WHERE id = 143`);
  await db.execute(sql`UPDATE users SET display_name = 'Ernst' WHERE id = 92`);
  const res = await db.execute(sql`SELECT id, email, display_name FROM users`);
  console.table(res.rows);
  process.exit(0);
}
run();
