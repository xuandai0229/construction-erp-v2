import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import { Client } from "pg";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    const value = parse(fs.readFileSync(filePath)).DATABASE_URL;
    if (value) return value;
  }
  throw new Error("DATABASE_URL chưa được cấu hình.");
}

const tables = [
  "SupervisionWeeklyDossier",
  "SupervisionWeeklyEntry",
  "SupervisionWeeklyQuantity",
  "SupervisionWeeklyTransition",
  "SupervisionWeeklyProgress",
  "SupervisionWeeklyObservation",
  "SupervisionWeeklyAttachment",
  "SupervisionWeeklyRevision",
];

async function main() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  try {
  await client.connect();
  const migration = await client.query(`SELECT migration_name, finished_at, rolled_back_at, logs FROM public._prisma_migrations WHERE migration_name = $1`, ["20260720143000_supervision_weekly_rebuild"]);
  const tableRows = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name`, [tables]);
  const dossierColumns = await client.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SupervisionWeeklyDossier' ORDER BY ordinal_position`);
  const regclass = await client.query(`SELECT to_regclass('public."SupervisionWeeklyDossier"') AS dossier_table`);
  const row = migration.rows[0] as { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null; logs: string | null } | undefined;
  console.log(JSON.stringify({
    migration: row ? {
      migrationName: row.migration_name,
      state: row.rolled_back_at ? "ROLLED_BACK" : row.finished_at ? "APPLIED" : "FAILED_OR_INCOMPLETE",
      finishedAt: row.finished_at,
      rolledBackAt: row.rolled_back_at,
      hasLogs: Boolean(row.logs),
    } : { state: "NOT_IN_HISTORY" },
    dossierRegclass: regclass.rows[0]?.dossier_table ?? null,
    existingTables: tableRows.rows.map((item) => item.table_name),
    dossierColumns: dossierColumns.rows,
  }, null, 2));
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi không xác định khi kiểm tra database.";
  console.error(message);
  process.exitCode = 1;
});
