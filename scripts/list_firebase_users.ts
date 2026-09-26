import { adminAuth } from './src/lib/firebase-admin.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    let listUsersResult = await adminAuth.listUsers(1000);
    console.log("Found Firebase users:", listUsersResult.users.length);
    for (const userRecord of listUsersResult.users) {
      console.log("Checking user:", userRecord.uid, userRecord.email);
      const existing = await db.select().from(users).where(eq(users.uid, userRecord.uid));
      if (existing.length === 0) {
        console.log("Missing in SQL! Inserting...");
        await db.insert(users).values({
          uid: userRecord.uid,
          email: userRecord.email || "",
          displayName: userRecord.displayName || "",
          verificationStatus: 'verified',
        });
        console.log("Inserted.");
      } else {
        console.log("Already in SQL.");
      }
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
