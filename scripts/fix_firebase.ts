import { config } from 'dotenv';
config();
import { adminAuth } from './src/lib/firebase-admin.ts';

async function main() {
  try {
    const user = await adminAuth.getUserByEmail('ernst@hatake.eu');
    await adminAuth.updateUser(user.uid, { password: 'Yb07tw44!' });
    console.log("Password updated successfully for", user.email, "uid:", user.uid);
  } catch (error) {
    console.error("Firebase Admin Error:", error);
  }
  process.exit(0);
}

main().catch(console.error);
