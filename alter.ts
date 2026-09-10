import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';
async function run() {
  try {
    await db.execute(sql`ALTER TABLE leads ADD COLUMN location text;`);
    console.log("Altered leads table");
  } catch (e: any) {
    console.log("Error or already added:", e.message);
  }
}
run();
