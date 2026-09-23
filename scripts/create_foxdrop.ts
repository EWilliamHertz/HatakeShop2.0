import 'dotenv/config';
import fs from 'fs';
import { db } from '../src/db/index.ts';
import { users, products } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const apiKey = config.apiKey;

const email = "info@foxdropstore.com";
const password = "Yb07tw44";

async function run() {
  console.log("Creating user in Firebase...");
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

  // Insert or get user in Postgres
  console.log("Upserting user in Postgres...");
  await db.insert(users).values({
    uid,
    email,
    role: 'admin',
    displayName: 'FoxDrop',
    companyName: 'FoxDrop Store',
    verificationStatus: 'verified'
  }).onConflictDoNothing();

  const userRecords = await db.select().from(users).where(eq(users.uid, uid));
  const userId = userRecords[0].id;
  console.log("Postgres user ID:", userId);

  // Read CSV
  console.log("Loading products from CSV...");
  const csvContent = fs.readFileSync('./foxdrop_import.csv', 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  console.log(`Found ${records.length} products to insert.`);
  let count = 0;
  for (const record of records) {
    const title = record['Product'];
    const desc = record['Configuration'] || title;
    let priceStr = record['Price'].replace('€', '').replace(',', '').trim();
    if (!priceStr || isNaN(Number(priceStr))) {
        priceStr = "0";
    }

    const imageFilename = record['Image_File'];
    const imageUrl = `/images/foxdrop/${imageFilename}`;

    await db.insert(products).values({
      sellerId: userId,
      title: title,
      description: desc,
      unitCost: priceStr,
      stockQuantity: 100, // Default for "In Stock"
      moq: 1,
      originType: "warehouse", // From Italy
      leadTimeDays: 2,
      images: [imageUrl],
      brand: "Pokemon"
    });
    count++;
  }

  console.log(`Successfully inserted ${count} products!`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
