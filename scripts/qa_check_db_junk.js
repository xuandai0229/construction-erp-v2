require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const proj = await c.query('SELECT id, name, "deletedAt" FROM "Project"');
  console.log('Projects:', proj.rows);
  const users = await c.query('SELECT email, name FROM "User"');
  console.log('Users:', users.rows);
  await c.end();
}
run();
