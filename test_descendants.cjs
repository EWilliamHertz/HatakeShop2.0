const { Client } = require('pg');
const client = new Client({ host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: 'cloud_sql_production_database', connectionTimeoutMillis: 30000 });
client.connect().then(async () => {
  const res = await client.query('SELECT * FROM categories');
  
  const allCats = res.rows;
  const result = new Set();
  const queue = [4];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (current !== undefined && !result.has(current)) {
      result.add(current);
      const children = allCats.filter(c => c.parent_id === current).map(c => c.id);
      queue.push(...children);
    }
  }
  console.log(Array.from(result));
  
  client.end();
}).catch(console.error);
