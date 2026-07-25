import "dotenv/config";
import { Client } from "pg";
import { assertSafeQaDatabase, type DatabaseFingerprint } from "./assert-safe-qa-database";

const tables = [
  "SupervisionWeeklyQuantity",
  "SupervisionWeeklyTransition",
] as const;

const columns = [
  "verificationMode",
  "varianceReason",
] as const;

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};

type MigrationRow = {
  migration_name: string;
  checksum: string;
  finished: boolean;
  rolled_back: boolean;
};

async function inspectTarget(
  label: "application" | "qa",
  connectionString: string,
  expected: DatabaseFingerprint,
) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");

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
    if (!actual || actual.database !== expected.database) {
      throw new Error(`${label} connection does not match its validated fingerprint`);
    }

    const actualColumns = await client.query<ColumnRow>(
      `
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
          AND column_name = ANY($2::text[])
        ORDER BY table_name, column_name
      `,
      [tables, columns],
    );

    const migrations = await client.query<MigrationRow>(`
      SELECT
        migration_name,
        checksum,
        finished_at IS NOT NULL AS finished,
        rolled_back_at IS NOT NULL AS rolled_back
      FROM public."_prisma_migrations"
      ORDER BY started_at, migration_name
    `);

    await client.query("ROLLBACK");

    return {
      label,
      database: actual.database,
      host: expected.host,
      port: expected.port,
      schema: actual.schema,
      columns: Object.fromEntries(
        tables.map((table) => [
          table,
          Object.fromEntries(
            columns.map((column) => {
              const found = actualColumns.rows.find(
                (row) => row.table_name === table && row.column_name === column,
              );
              return [
                column,
                found
                  ? {
                      exists: true,
                      dataType: found.data_type,
                      nullable: found.is_nullable === "YES",
                      default: found.column_default,
                    }
                  : { exists: false },
              ];
            }),
          ),
        ]),
      ),
      migrations: migrations.rows.map((migration) => ({
        name: migration.migration_name,
        checksum: migration.checksum,
        finished: migration.finished,
        rolledBack: migration.rolled_back,
      })),
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const safety = assertSafeQaDatabase();
  const applicationUrl = process.env.DATABASE_URL;
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!applicationUrl || !qaUrl) throw new Error("DATABASE_URL and QA_DATABASE_URL are required");

  const [application, qa] = await Promise.all([
    inspectTarget("application", applicationUrl, safety.productionDatabase),
    inspectTarget("qa", qaUrl, safety.qaDatabase),
  ]);

  console.log(JSON.stringify({
    safe: true,
    readOnly: true,
    application,
    qa,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown column drift inspection failure");
  process.exitCode = 1;
});
