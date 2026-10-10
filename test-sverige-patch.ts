import 'dotenv/config';
import { adminAuth } from './src/lib/firebase-admin.js';
import { db } from './src/db/index.js';
import { products } from './src/db/schema.js';

async function main() {
  const token = await adminAuth.createCustomToken('uJjvZKedn0MBrz75w6bd9Az8P0H3');
  const API_KEY = process.env.VITE_FIREBASE_API_KEY;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, returnSecureToken: true })
  });
  const idToken = (await res.json()).idToken;

  const firstProduct = await db.select().from(products).limit(1);
  const pId = firstProduct[0].id;

  const patchRes = await fetch(`http://localhost:3000/api-v2/admin/products/${pId}/sverige`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ isSverigeB2c: true })
  });
  
  console.log("Status:", patchRes.status);
  console.log("Body:", await patchRes.text());
  process.exit(0);
}
main();
