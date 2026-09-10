const admin = require('firebase-admin');
const config = require('./firebase-applet-config.json');

const app = admin.initializeApp({
  projectId: config.projectId,
});

const db = admin.firestore(app);
if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
  db.settings({ databaseId: config.firestoreDatabaseId });
}

async function run() {
  const snapshot = await db.collection('inquiries').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
run().catch(console.error);
