import { getOrCreateUser } from './src/db/users.ts';

async function run() {
  try {
    const user = await getOrCreateUser('fmzfhao4oZgkMWuQBISnGvIqEqY2', 'test@example.com', 'Test User');
    console.log("Success:", user);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
