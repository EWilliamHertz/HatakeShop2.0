import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './src/db/schema.ts';
const { Pool } = pkg;
async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  await db.execute(sql`UPDATE users SET role = 'both' WHERE id IN (1, 171)`);
  process.exit(0);
}
run();
