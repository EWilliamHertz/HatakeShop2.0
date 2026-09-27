const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const preorders = await pool.query('SELECT id, title FROM products WHERE seller_id = 393 AND is_preorder = true');
  let copied = 0;
  for (const po of preorders.rows) {
    const words = po.title.replace(/30th Anniversary/i, '').replace(/Preorder/i, '').trim().split(' ');
    const w1 = words[0] || '';
    const w2 = words[1] || '';
    const search = '%' + w1 + '%' + w2 + '%';
    
    const matches = await pool.query(`
      SELECT id, images, title FROM products 
      WHERE seller_id = 393 
      AND is_preorder = false 
      AND title ILIKE $1
      AND images != '[]'::jsonb
      AND images IS NOT NULL
      ORDER BY id ASC
      LIMIT 1
    `, [search]);
    
    if (matches.rows.length > 0) {
      let imageVal = matches.rows[0].images;
      if (typeof imageVal !== 'string') {
        imageVal = JSON.stringify(imageVal);
      }
      if (imageVal.startsWith('{"') && !imageVal.includes(':')) {
         imageVal = imageVal.replace('{', '[').replace('}', ']');
      }

      await pool.query('UPDATE products SET images = $1::jsonb WHERE id = $2', [imageVal, po.id]);
      console.log('Copied image from', matches.rows[0].id, `(${matches.rows[0].title})`, 'to preorder', po.id, `(${po.title})`);
      copied++;
    }
  }
  console.log('Total images copied:', copied);
  pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
