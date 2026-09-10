import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  console.log("Fixing Ernst...");
  
  // delete the new one (id 766)
  await db.delete(users).where(eq(users.id, 766));
  
  // set id 5 to have the real UID 'ernst-uid'
  await db.update(users).set({ uid: 'ernst-uid' }).where(eq(users.id, 5));

  console.log("Fixed Ernst.");
}
main().catch(console.error);
