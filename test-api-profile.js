import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fetch from 'node-fetch';

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
  })
});

async function main() {
  const token = await getAuth().createCustomToken('uJjvZKedn0MBrz75w6bd9Az8P0H3');
  // We need an ID token, custom token is not accepted by verifyIdToken directly.
  // We need to exchange custom token for ID token using Firebase Auth REST API
  const API_KEY = process.env.VITE_FIREBASE_API_KEY;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, returnSecureToken: true })
  });
  const json = await res.json();
  const idToken = json.idToken;
  
  if (!idToken) {
    console.error("Failed to get ID token", json);
    process.exit(1);
  }

  const profileRes = await fetch('http://localhost:3000/api-v2/profile', {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  console.log("Status:", profileRes.status);
  const text = await profileRes.text();
  console.log("Body:", text);
}
main();
