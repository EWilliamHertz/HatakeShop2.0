import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const result = await db.update(users).set({
      companyName: 'Test Company',
      someFakeField: 'fake'
    } as any).where(eq(users.uid, 'custom-1788190662945')).returning();
    console.log("Success:", result.length);
  } catch(e) {
    console.error("DB Error:", e.message);
  }
  process.exit(0);
}
run();
