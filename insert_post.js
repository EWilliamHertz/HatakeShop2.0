import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const content = "After over 16 years of supplying the entirety of China\nand several companies in the west\nwe now open up the gates even for the rest.\n\nHere we are! Hatake, let's go! \n\nhttps://youtu.be/CljtB485MjA?is=bX7Oy5CLNDn3JFN8";
  
  await pool.query(`
    INSERT INTO feed_posts (author_id, type, content, likes_count, comments_count)
    VALUES (1, 'info', $1, 42, 5)
  `, [content]);
  
  console.log("Post inserted");
  process.exit(0);
}
run();
