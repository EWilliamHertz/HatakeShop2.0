import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';

async function run() {
  try {
    const user1 = await getOrCreateUser('uid-1', '');
    console.log("User 1:", user1.uid);
    const user2 = await getOrCreateUser('uid-2', '');
    console.log("User 2:", user2.uid);
  } catch(e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
run();
