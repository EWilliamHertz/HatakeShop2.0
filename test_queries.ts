import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, or, where, getDocs, onSnapshot } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function test() {
    try {
        await signInWithEmailAndPassword(auth, 'ernst@hatake.eu', 'password123');
        const user = auth.currentUser!;
        console.log("Logged in as:", user.uid);
        
        const q = query(collection(db, 'inquiries'), or(where('buyerUid', '==', user.uid), where('sellerUid', '==', user.uid)));
        
        await new Promise((resolve, reject) => {
            onSnapshot(q, (snap) => {
                console.log("Docs found:", snap.size);
                resolve(null);
            }, (err) => {
                console.error("Snapshot error:", err);
                reject(err);
            });
        });
    } catch(err) {
        console.error("Auth/Execution error:", err);
    }
    process.exit(0);
}
test();
