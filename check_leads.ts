import { db } from "./src/db/index.ts";
import { leads } from "./src/db/schema.ts";
import { desc, sql, eq } from "drizzle-orm";
async function run() {
    const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
    const sentCount = await db.select({ count: sql`count(*)` }).from(leads).where(eq(leads.status, 'sent'));
    console.log("Leads:", allLeads.length);
    console.log("Sent Count:", sentCount);
}
run().then(() => process.exit(0)).catch(console.error);
