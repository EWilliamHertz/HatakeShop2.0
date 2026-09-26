import { db } from "./src/db/index.ts";
import { sql } from "drizzle-orm";
async function run() {
    try {
        await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS segment text DEFAULT 'TCG';`);
        console.log("Success adding segment column");
    } catch(e) {
        console.error("Error", e);
    }
}
run().then(()=>process.exit(0));
