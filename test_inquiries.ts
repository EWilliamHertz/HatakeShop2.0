import { db } from './src/db/index.ts';
import { inquiries } from './src/db/schema.ts';

async function run() {
  try {
    await db.select().from(inquiries).limit(1);
    console.log("OK");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
