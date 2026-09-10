import fs from 'fs';
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const apiKey = config.apiKey;

const email = "Phoebe@topbestpkg.com";
const password = "yourthebest";

async function run() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  
  let data = await res.json();
  let uid = data.localId;
  
  if (data.error && data.error.message === 'EMAIL_EXISTS') {
    console.log("User already exists. Logging in to get UID...");
    const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    data = await loginRes.json();
    uid = data.localId;
  }
  
  if (!uid) {
    console.error("Failed to get UID:", data);
    process.exit(1);
  }
  console.log("Firebase user UID:", uid);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  await client.query(`
    INSERT INTO users (uid, email, role, display_name, company_name, verification_status)
    VALUES ($1, $2, 'admin', 'Phoebe', 'TopBest Packaging', 'verified')
    ON CONFLICT (uid) DO UPDATE SET role = 'admin'
  `, [uid, email]);

  console.log("Postgres user upserted and set to admin!");
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
