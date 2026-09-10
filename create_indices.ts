import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Creating indices...");
  await db.execute(sql`CREATE INDEX IF NOT EXISTS users_uid_idx ON users(uid);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS users_team_owner_idx ON users(team_owner_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS inquiries_buyer_idx ON inquiries(buyer_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS inquiries_target_product_idx ON inquiries(target_product_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_idx ON inquiry_messages(inquiry_id);`);
  console.log("Done.");
  process.exit(0);
}
main();
