import { adminAuth } from './src/lib/firebase-admin.ts';
async function run() {
  const listUsersResult = await adminAuth.listUsers(1000);
  listUsersResult.users.forEach((userRecord) => {
    console.log('user', userRecord.toJSON());
  });
}
run();
