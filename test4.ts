import 'dotenv/config';
import { db } from './src/db/index.js';
import { getOrCreateUser } from './src/db/users.js';
import { sql, eq } from 'drizzle-orm';

async function main() {
  try {
    let user = await getOrCreateUser('testuid123', 'ernst@hatake.eu', 'Ernst');
    const { userFollowers } = await import('./src/db/schema.js');
    const following = await db.select({ count: sql`count(*)` }).from(userFollowers).where(eq(userFollowers.followerId, user.id));
    console.log({ ...user, followingCount: Number(following[0].count) });
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
