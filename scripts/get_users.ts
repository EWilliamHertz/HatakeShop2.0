import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT id, email, role, team_role, company_name FROM users;`);
  console.log(result.rows);
}

main().catch(console.error);
