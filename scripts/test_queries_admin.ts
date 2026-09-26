import { initializeApp as initAdmin, getApp as getAdminApp, getApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initClient } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, or, where, onSnapshot } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

if (!getApps().length) {
    initAdmin({ projectId: firebaseConfig.projectId });
}
const adminAuth = getAdminAuth();

const clientApp = initClient(firebaseConfig);
const clientAuth = getClientAuth(clientApp);
const db = getFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

async function test() {
    try {
        const users = await adminAuth.listUsers(5);
        const userRec = users.users[0];
        console.log("Testing as:", userRec.uid, userRec.email);
        
        const token = await adminAuth.createCustomToken(userRec.uid);
        await signInWithCustomToken(clientAuth, token);
        
        const q = query(collection(db, 'inquiries'), or(where('buyerUid', '==', userRec.uid), where('sellerUid', '==', userRec.uid)));
        
        await new Promise((resolve, reject) => {
            onSnapshot(q, (snap) => {
                console.log("Docs found OR query:", snap.size);
                resolve(null);
            }, (err) => {
                console.error("OR Snapshot error:", err);
                reject(err);
            });
        });
        
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
test();
