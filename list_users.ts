import { adminAuth } from './src/lib/firebase-admin.ts';

async function main() {
  const usersResult = await adminAuth.listUsers(1000);
  const ernstUsers = usersResult.users.filter(u => u.email === 'ernst@hatake.eu');
  console.log("Ernst users in Firebase:", ernstUsers.map(u => ({ email: u.email, uid: u.uid })));
  process.exit(0);
}

main().catch(console.error);
