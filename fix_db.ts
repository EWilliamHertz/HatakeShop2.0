import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { users } from './src/db/schema.ts';
import { eq, like, or } from 'drizzle-orm';
import { config } from 'dotenv';
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  const hatakeUsers = await db.select().from(users).where(or(like(users.companyName, '%Hatake%'), like(users.email, '%hatake%')));
  console.log("Hatake users:", JSON.stringify(hatakeUsers.map(u => ({ id: u.id, email: u.email, teamOwnerId: u.teamOwnerId, role: u.teamRole })), null, 2));
  
  process.exit(0);
}

main().catch(console.error);
