import { adminDb } from './src/lib/firebase-admin.ts';
adminDb.collection('inquiries').get().then(snap => {
   console.log("Inquiries count:", snap.size);
   process.exit(0);
}).catch(err => {
   console.error(err);
   process.exit(1);
});
