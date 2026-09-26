import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq, isNotNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function run() {
  const allUsers = await db.select().from(users).where(isNotNull(users.password));
  for (const user of allUsers) {
    if (user.password && !user.password.startsWith('$2a$')) {
       console.log(`Hashing password for ${user.email}...`);
       const hash = await bcrypt.hash(user.password, 10);
       await db.update(users).set({ password: hash }).where(eq(users.id, user.id));
    }
  }
  console.log("Password migration complete.");
  process.exit(0);
}
run();
