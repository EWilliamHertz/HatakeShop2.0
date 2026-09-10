import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';
async function test() {
  const result = await db.execute(sql`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'users'::regclass AND contype = 'u';
  `);
  console.log(result.rows);
}
test().catch(console.error);
