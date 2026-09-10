import { db } from './src/db/db.js';
import { inquiryMessages, inquiries } from './src/db/schema.js';
import { eq, asc } from 'drizzle-orm';

async function run() {
  const msgs = await db.query.inquiryMessages.findMany({
    where: eq(inquiryMessages.inquiryId, 1),
    orderBy: [asc(inquiryMessages.createdAt)],
    with: { sender: true }
  });
  console.log(msgs);
}
run();
