import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { ilike } from 'drizzle-orm';

async function run() {
  const res = await db.select({ id: users.id, companyName: users.companyName }).from(users).where(ilike(users.companyName, '%TopBestPKG%'));
  console.log(res);
  process.exit(0);
}
run();
