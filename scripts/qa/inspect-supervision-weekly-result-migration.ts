import "dotenv/config";
import { Client } from "pg";

const migrationName = "20260720150000_supervision_weekly_result_tables";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL chưa được cấu hình.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const [migration, columns, tables, indexes, constraints, enumValues] = await Promise.all([
      client.query(`SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs IS NOT NULL AS has_logs FROM public._prisma_migrations WHERE migration_name = $1 ORDER BY started_at DESC`, [migrationName]),
      client.query(`SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'SupervisionWeeklyTransition' AND column_name = ANY($1::text[])) OR (table_name = 'SupervisionWeeklyProgress' AND column_name = ANY($2::text[]))) ORDER BY table_name, ordinal_position`, [["reportedQuantity", "reportedText", "reportedUnit", "verifiedQuantity", "verifiedText", "verifiedUnit", "varianceQuantity", "plannedProgress"], ["delayValue", "delayType"]]),
      client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SupervisionWeeklyShiftSelection'`),
      client.query(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'SupervisionWeeklyShiftSelection' ORDER BY indexname`),
      client.query(`SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'public."SupervisionWeeklyShiftSelection"'::regclass ORDER BY conname`),
      client.query(`SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'SupervisionWeeklyDelayType' ORDER BY e.enumsortorder`),
    ]);
    console.log(JSON.stringify({ migration: migration.rows, columns: columns.rows, tables: tables.rows, indexes: indexes.rows, constraints: constraints.rows, enumValues: enumValues.rows.map((row) => row.enumlabel) }, null, 2));
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Không thể kiểm tra migration.");
  process.exitCode = 1;
});
