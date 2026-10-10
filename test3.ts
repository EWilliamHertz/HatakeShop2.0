import 'dotenv/config';
import { getOrCreateUser, getUserProfile } from './src/db/users.js';

async function main() {
  try {
    const user = await getOrCreateUser('testuid123', 'ernst@hatake.eu', 'Ernst Test');
    console.log(user);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
