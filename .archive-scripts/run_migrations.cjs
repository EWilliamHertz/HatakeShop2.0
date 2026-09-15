const { Client } = require('pg');
const fs = require('fs');
async function migrate(dbName) {
  const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_ADMIN_USER, password: process.env.SQL_ADMIN_PASSWORD, database: dbName });
  await client.connect();
  const sql = fs.readFileSync('drizzle/0005_medical_steel_serpent.sql', 'utf8');
  const stmts = sql.split('--> statement-breakpoint');
  for (const stmt of stmts) {
    if (!stmt.trim()) continue;
    try {
      await client.query(stmt);
      console.log('Executed:', stmt.substring(0, 50));
    } catch (e) {
      console.log('Failed:', stmt.substring(0, 50), e.message);
    }
  }
  await client.end();
}
migrate('cloud_sql_development_database').then(() => migrate('cloud_sql_production_database')).catch(console.error);
