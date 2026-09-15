import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const apiKey = config.apiKey;

const email = "Phoebe@topbestpkg.com";
const password = "yourthebest";

async function run() {
  const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await loginRes.json();
  const token = data.idToken;

  const patchRes = await fetch('http://localhost:3000/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ 
      companyName: 'Topbestpkg',
      role: 'buyer',
      autoTranslate: false,
      preferredLanguage: 'English',
      kybDocuments: [],
      socialLinks: [],
      portfolio: [],
      verificationStatus: 'verified'
    })
  });
  console.log('Patch result:', patchRes.status);
  const patchData = await patchRes.text();
  console.log(patchData);
}
run();
