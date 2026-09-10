import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const result = await db.update(users).set({
      companyName: 'Test Company'
    }).where(eq(users.uid, 'non-existent-uid')).returning();
    console.log("Success:", result);
  } catch(e) {
    console.error("DB Error:", e);
  }
  process.exit(0);
}
run();
