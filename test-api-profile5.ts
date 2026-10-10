import 'dotenv/config';
import { adminAuth } from './src/lib/firebase-admin.js';

async function main() {
  const token = await adminAuth.createCustomToken('uJjvZKedn0MBrz75w6bd9Az8P0H3');
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
  process.exit(0);
}
main();
