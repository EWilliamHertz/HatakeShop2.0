import { db } from './src/db/index.ts';
import { leads } from './src/db/schema.ts';

async function run() {
  const allLeads = await db.select().from(leads);
  console.log("Total leads:", allLeads.length);
  console.log(allLeads);
  process.exit(0);
}
run();
