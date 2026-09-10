import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({ projectId: "ai-studio-e614ca8c-59b5-4175-a853-43233cc0fc36" });
const db = getFirestore();
db.collection("inquiries").get().then(snap => {
    console.log("Inquiries count:", snap.size);
    snap.forEach(doc => console.log(doc.id, doc.data()));
    process.exit(0);
});
