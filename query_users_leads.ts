import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/db/index.ts';
import { users, leads } from './src/db/schema.ts';

async function main() {
  const allUsers = await db.select({
    id: users.id,
    companyName: users.companyName,
    role: users.role,
    teamOwnerId: users.teamOwnerId,
    verificationStatus: users.verificationStatus
  }).from(users);
  
  const allLeads = await db.select({
    id: leads.id,
    companyName: leads.companyName,
    status: leads.status
  }).from(leads);

  console.log('Users:', allUsers);
  console.log('Leads:', allLeads);
  process.exit(0);
}
main();
