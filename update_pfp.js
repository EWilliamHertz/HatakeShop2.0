import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    UPDATE users SET profile_picture_url = 'https://ui-avatars.com/api/?name=Top+Best+PKG&background=0D8ABC&color=fff&size=256' WHERE id = 1 AND (profile_picture_url IS NULL OR profile_picture_url = '');
  `);
  console.log("TopBestPKG profile picture updated");
  process.exit(0);
}
run();
