import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

getDocs(collection(db, "inquiries")).then(snap => {
   console.log("Inquiries count client:", snap.size);
   process.exit(0);
}).catch(err => {
   console.error(err);
   process.exit(1);
});
