import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({ projectId: "home-499217" });
const db = getFirestore(app);
db.collection("inquiries").get().then(snap => {
    console.log("Inquiries count default DB:", snap.size);
    process.exit(0);
});
