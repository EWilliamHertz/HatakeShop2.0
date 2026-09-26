import { db } from './src/db/index.ts';
import { leads } from './src/db/schema.ts';

async function run() {
  try {
    const allLeads = await db.select().from(leads).limit(1);
    console.log("Success, leads:", allLeads.length);
  } catch(e) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
run();
