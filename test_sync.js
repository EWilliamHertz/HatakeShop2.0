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

  const syncRes = await fetch('http://localhost:3000/api/auth/sync', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  console.log("SYNC:", await syncRes.text());

  const meRes = await fetch('http://localhost:3000/api/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log("ME AFTER SYNC:", await meRes.text());
}
run();
