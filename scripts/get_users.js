require('dotenv').config();
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.query('SELECT email, username, "role" FROM "User"')).then(res => console.log(res.rows)).finally(() => c.end());
