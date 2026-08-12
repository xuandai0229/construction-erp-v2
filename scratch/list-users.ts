import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL;

async function main() {
  console.log('Connecting to:', connectionString ? connectionString.replace(/:[^:@]+@/, ':***@') : 'UNDEFINED');
  const pool = new Pool({ connectionString });
  const res = await pool.query('SELECT id, email, name, role, "isActive" FROM "User" LIMIT 20;');
  console.log('--- USER ACCOUNTS IN DATABASE ---');
  console.table(res.rows);
  await pool.end();
}

main().catch((err) => console.error(err));
