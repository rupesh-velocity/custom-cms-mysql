require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const settings = await pool.query('SELECT * FROM "Setting"');
  console.log("Settings:", settings.rows);
  
  const page = await pool.query('SELECT * FROM "Page" WHERE slug = $1', ['test']);
  console.log("Test Page:", page.rows);
}
main().catch(console.error).finally(() => pool.end());
