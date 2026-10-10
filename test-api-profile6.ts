import 'dotenv/config';
import { db } from './src/db/index.js';
import { getUserProfile, getOrCreateUser } from './src/db/users.js';
import { sql, eq } from 'drizzle-orm';

async function main() {
  try {
    let user = await getUserProfile('uJjvZKedn0MBrz75w6bd9Az8P0H3');
    if (!user) {
        user = await getOrCreateUser('uJjvZKedn0MBrz75w6bd9Az8P0H3', "ernst@hatake.eu", undefined);
    }
    
    const { userFollowers } = await import('./src/db/schema.js');
    const following = await db.select({ count: sql`count(*)` }).from(userFollowers).where(eq(userFollowers.followerId, user.id));
    console.log("Success:", { ...user, followingCount: Number(following[0].count) });
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
main();
