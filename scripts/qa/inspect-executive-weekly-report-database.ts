import "dotenv/config";
import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function query(label: string, sql: string) {
  try {
    const result = await client.query(sql);
    console.log(`${label}: ${JSON.stringify(result.rows)}`);
  } catch (error) {
    console.log(`${label}: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}`);
  }
}

async function main() {
  await client.connect();

  await query(
    "tables",
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE 'ExecutiveWeekly%' ORDER BY tablename",
  );
  await query(
    "migration",
    "SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name ILIKE '%executive%' ORDER BY finished_at",
  );
  await query(
    "counts",
    `SELECT 'ExecutiveWeeklyReport' AS table_name, COUNT(*)::int AS row_count FROM "ExecutiveWeeklyReport"
     UNION ALL SELECT 'ExecutiveWeeklyProjectDetail', COUNT(*)::int FROM "ExecutiveWeeklyProjectDetail"
     UNION ALL SELECT 'ExecutiveWeeklyDecisionItem', COUNT(*)::int FROM "ExecutiveWeeklyDecisionItem"
     UNION ALL SELECT 'ExecutiveWeeklyReportVersion', COUNT(*)::int FROM "ExecutiveWeeklyReportVersion"`,
  );
  await query(
    "foreignKeys",
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, rc.delete_rule
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND (tc.table_name ILIKE 'ExecutiveWeekly%' OR ccu.table_name ILIKE 'ExecutiveWeekly%')
     ORDER BY tc.table_name, kcu.column_name`,
  );

  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exit(1);
});
