const { eq, sql, inArray, and } = require('drizzle-orm');
const { products } = require('./src/db/schema');

const conditions = [
  eq(products.approvalStatus, 'approved'),
  sql`(${products.productType} = 'sealed' OR ${products.productType} IS NULL)`
];
console.log(conditions);
