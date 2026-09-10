const fs = require('fs');
const { Client } = require('pg');

async function run() {
  const client = new Client({ 
    host: process.env.SQL_HOST, 
    user: process.env.SQL_ADMIN_USER, 
    password: process.env.SQL_ADMIN_PASSWORD, 
    database: 'cloud_sql_production_database', 
    connectionTimeoutMillis: 30000 
  });
  
  await client.connect();
  console.log("Connected as admin to prod DB");
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS "feedback" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer,
      "type" text NOT NULL,
      "message" text NOT NULL,
      "status" text DEFAULT 'Pending',
      "created_at" timestamp DEFAULT now()
    );`,
    `ALTER TABLE "inquiries" ALTER COLUMN "status" SET DEFAULT 'Draft';`,
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'Unpaid';`,
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;`,
    `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" text;`,
    `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "invite_token_hash" text;`,
    `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "opened_at" timestamp;`,
    `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "redeemed_at" timestamp;`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_onboarding_complete" boolean DEFAULT false;`
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log("Successfully executed:", q.substring(0, 50) + "...");
    } catch(e) {
      console.log("Skipping (already exists or error):", e.message);
    }
  }

  await client.end();
  console.log("Done");
}

run().catch(console.error);
