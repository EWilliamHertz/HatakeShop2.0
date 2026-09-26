import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq, or } from 'drizzle-orm';

async function fix() {
  const res = await db.update(users).set({
    verificationStatus: 'verified',
    teamRole: 'sales_rep' // though for Mark maybe he should be owner? The user said "needed for mark... as an admin". Let's set him to verified so he can access the portal.
  }).where(eq(users.email, 'mark.lj@hotmail.com')).returning();
  console.log("Fixed user:", res);
  process.exit(0);
}
fix();
