import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, or, where, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function test() {
    try {
        await signInWithEmailAndPassword(auth, 'ernst@hatake.eu', 'password123'); 
        const user = auth.currentUser!;
        console.log("Logged in as:", user.uid);
        
        const q1 = query(collection(db, 'inquiries'), or(where('buyerUid', '==', user.uid), where('sellerUid', '==', user.uid)));
        const snap = await getDocs(q1);
        console.log("Docs found:", snap.size);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
test();
