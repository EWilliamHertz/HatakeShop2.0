const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const map = {
    260: 122,
    261: 157,
    264: 114,
    265: 163,
    266: 113,
    267: 117,
    268: 113,
    270: 125,
    271: 150
  };
  
  let copied = 0;
  for (const [targetId, sourceId] of Object.entries(map)) {
    const src = await pool.query('SELECT images FROM products WHERE id = $1', [sourceId]);
    if (src.rows.length > 0) {
      let img = src.rows[0].images;
      if (typeof img !== 'string') img = JSON.stringify(img);
      if (img.startsWith('{"') && !img.includes(':')) img = img.replace('{', '[').replace('}', ']');
      await pool.query('UPDATE products SET images = $1::jsonb WHERE id = $2', [img, targetId]);
      copied++;
    }
  }
  console.log('Manually copied images:', copied);
  pool.end();
}
run();
