const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_ADMIN_USER, password: process.env.SQL_ADMIN_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  console.log("Connected as admin to prod DB");
  try {
    await client.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text;');
    console.log("Added password column successfully!");
  } catch (e) {
    console.error("Error adding column:", e);
  }
  
  try {
    await client.query('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS users_uid_unique;');
    await client.query('ALTER TABLE "users" ADD CONSTRAINT users_uid_unique UNIQUE (uid);');
    console.log("Fixed uid constraint");
  } catch (e) { console.error(e) }
  
  try {
    await client.query('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS users_email_unique;');
    await client.query('ALTER TABLE "users" ADD CONSTRAINT users_email_unique UNIQUE (email);');
    console.log("Fixed email constraint");
  } catch (e) { console.error(e) }
  
  try {
    await client.query('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS users_invite_code_unique;');
    await client.query('ALTER TABLE "users" ADD CONSTRAINT users_invite_code_unique UNIQUE (invite_code);');
    console.log("Fixed invite_code constraint");
  } catch (e) { console.error(e) }

  client.end();
}).catch(console.error);
