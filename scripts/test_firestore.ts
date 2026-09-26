import { adminDb } from "./src/lib/firebase-admin.ts";
async function run() {
  await adminDb.collection("inquiries").doc("1").set({ test: true }, { merge: true });
  console.log("Write success!");
}
run().catch(console.error);
