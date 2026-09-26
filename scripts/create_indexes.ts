import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS users_uid_idx ON users (uid);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS users_team_owner_idx ON users (team_owner_id);`);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS products_seller_idx ON products (seller_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS products_approval_idx ON products (approval_status);`);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS inquiries_buyer_idx ON inquiries (buyer_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS inquiries_target_product_idx ON inquiries (target_product_id);`);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages (inquiry_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS inquiry_messages_sender_idx ON inquiry_messages (sender_id);`);
    console.log("Indexes created successfully");
  } catch(e) {
    console.error("Failed to create indexes", e);
  }
}
main().catch(console.error);
