import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_likes (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(post_id, user_id)
    );
    
    CREATE TABLE IF NOT EXISTS feed_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("Social tables added");
  process.exit(0);
}
run();
