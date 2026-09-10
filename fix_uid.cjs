const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

pool.query('ALTER TABLE users ADD CONSTRAINT users_uid_unique UNIQUE (uid)', (err, res) => {
  if (err) console.error(err);
  else console.log('Successfully added unique constraint');
  pool.end();
});
