const { execSync } = require('child_process');
process.env.SQL_DB_NAME = 'cloud_sql_production_database';
try {
  execSync('npx drizzle-kit push --config=src/db/drizzle.config.ts --force', { stdio: 'inherit' });
} catch (e) {
  console.log("Failed with force");
}
