import { db } from './src/db';
import { inquiries, products } from './src/db/schema';
import { eq, inArray, and, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function run() {
    console.log("running");
}
