import 'dotenv/config';
import { db } from '../src/db/index.js';
import { users, companyMembers } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const [ernst] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'ernst@hatake.eu'));
  if (!ernst) { console.log('User not found'); process.exit(1); }

  const result = await db.update(companyMembers)
    .set({ role: 'owner' })
    .where(eq(companyMembers.userId, ernst.id))
    .returning({ companyId: companyMembers.companyId, role: companyMembers.role });

  console.log('Updated memberships:', result);
  process.exit(0);
}
run().catch(console.error);
