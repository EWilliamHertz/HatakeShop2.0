import { eq, sql, inArray, and } from 'drizzle-orm';
import { products } from './src/db/schema';
import { db } from './src/db';

async function run() {
  const conditions = [
    eq(products.approvalStatus, 'approved'),
    sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`,
    inArray(products.categoryId, [4])
  ];
  
  const query = db.select().from(products).where(and(...conditions));
  console.log(query.toSQL());
  const res = await query;
  console.log("Count:", res.length);
}
run();
