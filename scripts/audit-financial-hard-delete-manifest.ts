import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL không tồn tại.");

const targetTables = ["Supplier", "Contract", "PaymentPlan", "PaymentRecord", "PaymentRequest"] as const;

async function main() {
  const parsed = new URL(databaseUrl!);
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5_000 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const fingerprintResult = await client.query<{ database: string; user: string; host: string | null; port: number | null }>(
      "SELECT current_database() AS database, current_user AS user, inet_server_addr()::text AS host, inet_server_port() AS port",
    );
    const counts: Record<string, number> = {};
    for (const table of targetTables) {
      const result = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM "${table}"`);
      counts[table] = Number(result.rows[0].count);
    }
    const approvalTypes = await client.query<{ type: string; count: string }>(
      `SELECT type::text, count(*)::text AS count FROM "ApprovalRequest" WHERE type IN ('PAYMENT', 'CONTRACT') GROUP BY type ORDER BY type`,
    );
    const foreignKeys = await client.query<{
      constraintName: string; sourceTable: string; sourceColumn: string; targetTable: string; targetColumn: string;
    }>(`
      SELECT tc.constraint_name AS "constraintName", tc.table_name AS "sourceTable", kcu.column_name AS "sourceColumn",
             ccu.table_name AS "targetTable", ccu.column_name AS "targetColumn"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_name = ANY($1::text[]) OR ccu.table_name = ANY($1::text[]))
      ORDER BY tc.table_name, tc.constraint_name`, [targetTables]);
    await client.query("ROLLBACK");
    const dbName = fingerprintResult.rows[0].database;
    const environmentGuess = /(prod|production)/i.test(dbName) ? "PRODUCTION_LIKE" : /(qa|test|ci|sandbox)/i.test(dbName) ? "QA_TEST_LIKE" : /(dev|local)/i.test(dbName) || ["localhost", "127.0.0.1"].includes(parsed.hostname) ? "DEVELOPMENT_LIKE" : "UNKNOWN";
    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(),
      readOnly: true,
      environmentGuess,
      url: { host: parsed.hostname, port: parsed.port || "5432", database: decodeURIComponent(parsed.pathname.slice(1)) },
      fingerprint: fingerprintResult.rows[0],
      tables: counts,
      approvalTypes: approvalTypes.rows.map((row) => ({ type: row.type, count: Number(row.count) })),
      foreignKeys: foreignKeys.rows,
    }, null, 2));
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* no transaction */ }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
