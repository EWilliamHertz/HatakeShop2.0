import { db } from './src/db';
import { reviews } from './src/db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const [review] = await db.insert(reviews).values({
      reviewerId: 1,
      targetUserId: 1,
      targetProductId: null,
      inquiryId: null,
      rating: 5,
      title: 'test',
      comment: 'test',
      images: []
    }).returning();
    console.log(review);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
run();
