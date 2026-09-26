import 'dotenv/config';
import { db } from "./src/db/index.js";
import { users } from "./src/db/schema.js";

async function forceAdmin() {
  console.log("Upgrading your live account...");
  
  // Force upgrade ALL accounts in the database to Admin/Owner
  const result = await db.update(users)
    .set({ 
      displayName: 'Ernst', 
      role: 'admin', 
      companyName: 'Hatake KB',
      teamRole: 'owner',
      verificationStatus: 'verified',
      country: 'SE'
    })
    .returning();
  
  console.log(`Success! ${result.length} account(s) upgraded.`);
  result.forEach(r => console.log(`- ${r.email} is now an Admin.`));
  
  process.exit(0);
}

forceAdmin();
