import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function test() {
    try {
        await signInWithEmailAndPassword(auth, 'buyer@example.com', 'password123'); // assuming this exists, or use test accounts from db
        const user = auth.currentUser!;
        console.log("Logged in as:", user.uid);
        
        const q1 = query(collection(db, 'inquiries'), where('buyerUid', '==', user.uid));
        const snap = await getDocs(q1);
        console.log("Docs found:", snap.size);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
test();
