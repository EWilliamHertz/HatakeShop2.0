const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runFor(dbName) {
  const client = new Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: dbName,
  });

  try {
    await client.connect();
    console.log(`Connected to ${dbName} as ADMIN`);
    
    let files = fs.readdirSync('drizzle').filter(f => f.endsWith('.sql'));
    files = files.sort();
    
    const migrationFile = files[files.length - 1]; // get the latest one
    console.log(`Applying ${migrationFile} to ${dbName}`);
    const sql = fs.readFileSync(path.join('drizzle', migrationFile), 'utf8');
       
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
       
    for (const stmt of statements) {
      try {
         await client.query(stmt);
         console.log('Executed:', stmt.substring(0, 50).replace(/\n/g, ' '));
      } catch (e) {
         console.error('Error executing statement:', e.message);
      }
    }
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}

async function runAll() {
   await runFor('cloud_sql_development_database');
   await runFor('cloud_sql_production_database');
}

runAll();
