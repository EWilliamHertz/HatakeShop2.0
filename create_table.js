import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_posts (
      id SERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      tags JSONB DEFAULT '[]'::jsonb,
      budget TEXT,
      product_id INTEGER REFERENCES products(id),
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("Table created");
  process.exit(0);
}
run();
