import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({ projectId: "home-499217" });
const db = getFirestore(app, "ai-studio-e614ca8c-59b5-4175-a853-43233cc0fc36");
db.collection("inquiries").get().then(snap => {
    console.log("Inquiries count:", snap.size);
    process.exit(0);
});
