import { updateUserProfile } from './src/db/users.ts';

async function run() {
  try {
    const res = await updateUserProfile("mock-uid", {
      companyName: "Test",
      socialLinks: [],
      kybDocuments: [],
      portfolio: [],
      verificationStatus: "verified"
    });
    console.log("Success:", res);
  } catch (err: any) {
    console.error("Error:", err.message);
    if (err.cause) console.error("Cause:", err.cause);
  }
}
run();
