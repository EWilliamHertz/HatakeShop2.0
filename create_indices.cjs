require('dotenv').config();
const { Pool } = require('pg');

async function createIndices() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Creating indices...");
    await pool.query('CREATE INDEX IF NOT EXISTS users_uid_idx ON users(uid);');
    await pool.query('CREATE INDEX IF NOT EXISTS users_team_owner_idx ON users(team_owner_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS inquiries_buyer_idx ON inquiries(buyer_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS inquiries_target_product_idx ON inquiries(target_product_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages(inquiry_id);');
    console.log("Indices created successfully.");
  } catch (e) {
    console.error("Error creating indices:", e);
  } finally {
    pool.end();
  }
}
createIndices();
