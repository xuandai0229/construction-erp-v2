import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  console.log('--- EXECUTING DECOMMISSION TASK MODULE MIGRATION ---');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      DROP TABLE IF EXISTS "WorkTaskIdempotency" CASCADE;
      DROP TABLE IF EXISTS "WorkTaskOutboxMessage" CASCADE;
      DROP TABLE IF EXISTS "WorkTaskAction" CASCADE;
      DROP TABLE IF EXISTS "WorkTask" CASCADE;
      DROP TYPE IF EXISTS "WorkTaskIdempotencyState" CASCADE;
    `);

    console.log('Successfully dropped all WorkTask tables and enums in database.');

    // Check remaining tables
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'WorkTask%';
    `);

    console.log(`Remaining WorkTask tables in public schema: ${res.rows.length}`);
    if (res.rows.length > 0) {
      console.error('FAILED: Some WorkTask tables still exist!', res.rows);
      process.exit(1);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
