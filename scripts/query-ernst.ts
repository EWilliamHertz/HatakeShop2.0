import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function run() {
  const all = await db.select().from(users);
  console.log(all.filter(u => u.email === 'ernst@hatake.eu'));
  process.exit(0);
}
run();
