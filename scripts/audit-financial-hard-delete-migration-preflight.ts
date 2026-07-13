import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL không tồn tại.");

const targetTables = ["Supplier", "Contract", "PaymentPlan", "PaymentRecord", "PaymentRequest"];
const targetEnums = [
  "ApprovalRequestType",
  "UserRole",
  "ContractType",
  "ContractStatus",
  "PaymentStatus",
  "PaymentRequestStatus",
  "PaymentRequestType",
];

async function main() {
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5_000 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    let readQueue: Promise<unknown> = Promise.resolve();
    const read = <T>(text: string, values?: unknown[]) => {
      const scheduled = readQueue.then(() => client.query<T>(text, values));
      readQueue = scheduled.then(() => undefined, () => undefined);
      return scheduled;
    };
    const [fingerprint, tables, columns, foreignKeys, indexes, enumValues, enumUsage, userSummary, accountants, approvalSummary, notificationSummary, auditSummary] = await Promise.all([
      read<{ database: string; user: string; host: string | null; port: number | null }>(
        "SELECT current_database() AS database, current_user AS user, inet_server_addr()::text AS host, inet_server_port() AS port",
      ),
      read<{ tableName: string }>(
        `SELECT table_name AS "tableName" FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name`,
        [targetTables],
      ),
      read<{ tableName: string; columnName: string; dataType: string; udtName: string; nullable: string; defaultValue: string | null }>(
        `SELECT table_name AS "tableName", column_name AS "columnName", data_type AS "dataType", udt_name AS "udtName",
                is_nullable AS nullable, column_default AS "defaultValue"
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND (table_name = ANY($1::text[]) OR (table_name = 'ApprovalRequest' AND column_name = 'amount') OR (table_name = 'SystemSetting' AND column_name = 'fiscalYearStartMonth') OR (table_name = 'User' AND column_name = 'role'))
         ORDER BY table_name, ordinal_position`,
        [targetTables],
      ),
      read<{ constraintName: string; sourceTable: string; sourceColumn: string; targetTable: string; targetColumn: string }>(
        `SELECT tc.constraint_name AS "constraintName", tc.table_name AS "sourceTable", kcu.column_name AS "sourceColumn",
                ccu.table_name AS "targetTable", ccu.column_name AS "targetColumn"
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
         JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema
         WHERE tc.constraint_type = 'FOREIGN KEY' AND (tc.table_name = ANY($1::text[]) OR ccu.table_name = ANY($1::text[]))
         ORDER BY tc.table_name, tc.constraint_name`,
        [targetTables],
      ),
      read<{ tableName: string; indexName: string; indexDefinition: string }>(
        `SELECT tablename AS "tableName", indexname AS "indexName", indexdef AS "indexDefinition"
         FROM pg_indexes WHERE schemaname = 'public' AND tablename = ANY($1::text[]) ORDER BY tablename, indexname`,
        [targetTables],
      ),
      read<{ enumName: string; enumValue: string }>(
        `SELECT t.typname AS "enumName", e.enumlabel AS "enumValue"
         FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
         WHERE t.typname = ANY($1::text[]) ORDER BY t.typname, e.enumsortorder`,
        [targetEnums],
      ),
      read<{ enumName: string; tableName: string; columnName: string }>(
        `SELECT t.typname AS "enumName", c.relname AS "tableName", a.attname AS "columnName"
         FROM pg_type t JOIN pg_attribute a ON a.atttypid = t.oid
         JOIN pg_class c ON c.oid = a.attrelid
         WHERE t.typname = ANY($1::text[]) AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY t.typname, c.relname, a.attname`,
        [targetEnums],
      ),
      read<{ role: string; count: string }>(`SELECT role::text AS role, count(*)::text AS count FROM "User" GROUP BY role ORDER BY role`),
      read<{ id: string; role: string; isActive: boolean; deletedAt: Date | null; memberships: unknown }>(
        `SELECT u.id, u.role::text AS role, u."isActive" AS "isActive", u."deletedAt" AS "deletedAt",
                COALESCE(json_agg(json_build_object('projectId', pm."projectId", 'projectRole', pm.role::text) ORDER BY pm."projectId")
                  FILTER (WHERE pm.id IS NOT NULL), '[]'::json) AS memberships
         FROM "User" u LEFT JOIN "ProjectMember" pm ON pm."userId" = u.id AND pm."deletedAt" IS NULL AND pm."isActive" = true AND pm."leftAt" IS NULL
         WHERE u.role::text = 'ACCOUNTANT' GROUP BY u.id, u.role, u."isActive", u."deletedAt" ORDER BY u.id`,
      ),
      read<{ type: string; count: string }>(`SELECT type::text AS type, count(*)::text AS count FROM "ApprovalRequest" WHERE type::text IN ('CONTRACT', 'PAYMENT') GROUP BY type ORDER BY type`),
      read<{ count: string }>(`SELECT count(*)::text AS count FROM "Notification" WHERE upper(type) IN ('PAYMENT', 'CONTRACT', 'SUPPLIER') OR href LIKE '/accounting%' OR href LIKE '/contracts%' OR href LIKE '/suppliers%'`),
      read<{ count: string }>(`SELECT count(*)::text AS count FROM "AuditLog" WHERE upper("entityType") IN ('SUPPLIER', 'CONTRACT', 'PAYMENTPLAN', 'PAYMENT_PLAN', 'PAYMENTRECORD', 'PAYMENT_RECORD', 'PAYMENTREQUEST', 'PAYMENT_REQUEST') OR upper(action) LIKE '%SUPPLIER%' OR upper(action) LIKE '%CONTRACT%' OR upper(action) LIKE '%PAYMENT%'`),
    ]);
    await client.query("ROLLBACK");
    console.log(JSON.stringify({
      readOnly: true,
      fingerprint: fingerprint.rows[0],
      tables: tables.rows,
      columns: columns.rows,
      foreignKeys: foreignKeys.rows,
      indexes: indexes.rows,
      enumValues: enumValues.rows,
      enumUsage: enumUsage.rows,
      userSummary: userSummary.rows.map((row) => ({ ...row, count: Number(row.count) })),
      accountants: accountants.rows,
      approvalsToRemove: approvalSummary.rows.map((row) => ({ ...row, count: Number(row.count) })),
      notificationsToRemove: Number(notificationSummary.rows[0]?.count ?? 0),
      auditLogsToRemove: Number(auditSummary.rows[0]?.count ?? 0),
    }, null, 2));
  } finally {
    try { await client.query("ROLLBACK"); } catch { /* read-only transaction already closed */ }
    client.release();
    await pool.end();
  }
}

void main();
