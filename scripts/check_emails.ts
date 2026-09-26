import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
async function run() {
  const all = await db.select().from(users);
  console.log(all.map(u => ({uid: u.uid, email: u.email})));
  process.exit(0);
}
run();
