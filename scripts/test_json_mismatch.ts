import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const result = await db.update(users).set({
      kybDocuments: "[{}]" as any
    }).where(eq(users.uid, 'fmzfhao4oZgkMWuQBISnGvIqEqY2')).returning();
    console.log("Success");
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit(0);
}
run();
