import 'dotenv/config';
import { db } from "./src/db/index.js";
import { users } from "./src/db/schema.js";
import { ilike } from "drizzle-orm";

async function fixUser() {
  console.log("Restoring Ernst's identity...");
  
  // Find your real logged-in account via your email and upgrade it
  const result = await db.update(users)
    .set({ 
      displayName: 'Ernst', 
      role: 'admin', 
      companyName: 'Hatake KB',
      teamRole: 'owner',
      verificationStatus: 'verified'
    })
    .where(ilike(users.email, '%ernst%'))
    .returning();
  
  if (result.length > 0) {
    console.log(`Success! Identity restored for: ${result[0].email}`);
  } else {
    console.log("Could not find an account with 'ernst' in the email.");
  }
  process.exit(0);
}

fixUser();
