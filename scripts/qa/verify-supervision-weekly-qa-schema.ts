import "dotenv/config";
import { Client } from "pg";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";

const expectedTables = [
  "SupervisionWeeklyDossier",
  "SupervisionWeeklyShiftSelection",
  "SupervisionWeeklyEntry",
  "SupervisionWeeklyTransition",
  "SupervisionWeeklyQuantity",
  "SupervisionWeeklyProgress",
  "SupervisionWeeklyObservation",
  "SupervisionWeeklyAttachment",
  "SupervisionWeeklyRevision",
] as const;

async function main() {
  const safety = assertSafeQaDatabase();
  const connectionString = process.env.QA_DATABASE_URL;
  if (!connectionString) throw new Error("QA_DATABASE_URL is required");

  const client = new Client({ connectionString });
  await client.connect();
  try {
  const fingerprint = await client.query<{
    database: string;
    host: string;
    port: number;
    schema: string;
  }>(`
    SELECT
      current_database() AS database,
      COALESCE(inet_server_addr()::text, 'local-socket') AS host,
      inet_server_port() AS port,
      current_schema() AS schema
  `);
  const actual = fingerprint.rows[0];
  if (!actual || actual.database !== safety.qaDatabase.database) {
    throw new Error("Connected database does not match the validated QA fingerprint");
  }

  const tables = await client.query<{ table_name: string }>(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name
    `,
    [expectedTables],
  );
  const existing = new Set(tables.rows.map((row) => row.table_name));
  const missing = expectedTables.filter((table) => !existing.has(table));
  if (missing.length) throw new Error(`Missing QA supervision tables: ${missing.join(", ")}`);

  const migrations = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  );

    console.log(JSON.stringify({
      safe: true,
      database: actual.database,
      host: safety.qaDatabase.host,
      port: String(actual.port),
      schema: actual.schema,
      appliedMigrations: Number(migrations.rows[0]?.count ?? 0),
      tables: [...expectedTables],
    }, null, 2));
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown QA schema verification failure");
  process.exitCode = 1;
});
