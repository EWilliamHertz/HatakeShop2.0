import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';

async function main() {
  const start = Date.now();
  await db.select().from(users).limit(1);
  console.log('Query took:', Date.now() - start, 'ms');
}
main().catch(console.error);
