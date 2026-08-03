import "dotenv/config";
import { Client } from "pg";
import { validateCandidateDatabaseUrl, maskDatabaseUrl } from "./qa-db-guard-utils";

export async function inspectCandidateDb(candidateUrlInput?: string) {
  const candidateUrl = candidateUrlInput || process.env.CANDIDATE_DATABASE_URL;
  const validation = validateCandidateDatabaseUrl(candidateUrl);

  if (!validation.valid) {
    throw new Error(`[INSPECT_CANDIDATE_REJECTED] ${validation.reason}`);
  }

  const maskedUrl = maskDatabaseUrl(candidateUrl!);
  console.log(`[INSPECT_CANDIDATE] Connecting safely to: ${maskedUrl}`);

  const client = new Client({ connectionString: candidateUrl });
  await client.connect();

  try {
    const targetDbName = validation.dbName;
    const dbRes = await client.query<{ datname: string; size: string }>(
      "SELECT datname, pg_size_pretty(pg_database_size(datname)) as size FROM pg_database WHERE datname = $1",
      [targetDbName]
    );

    const ownerRes = await client.query<{ owner: string }>(
      "SELECT pg_catalog.pg_get_userbyid(d.datdba) as owner FROM pg_catalog.pg_database d WHERE d.datname = $1",
      [targetDbName]
    );

    const connRes = await client.query<{
      pid: number;
      application_name: string;
      client_addr: string | null;
      state: string;
      query_start: Date | null;
    }>(
      "SELECT pid, application_name, client_addr::text, state, query_start FROM pg_stat_activity WHERE datname = $1",
      [targetDbName]
    );

    const tablesRes = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    );
    const tables = tablesRes.rows.map((r) => r.table_name);

    const hasPrismaMigrations = tables.includes("_prisma_migrations");
    let migrationCount = 0;
    let latestMigration: string | null = null;
    if (hasPrismaMigrations) {
      const migCountRes = await client.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL'
      );
      migrationCount = migCountRes.rows[0]?.count ?? 0;

      const latestMigRes = await client.query<{ migration_name: string }>(
        'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1'
      );
      latestMigration = latestMigRes.rows[0]?.migration_name ?? null;
    }

    const hasSystemSetting = tables.includes("SystemSetting");
    let systemSettingCount = 0;
    if (hasSystemSetting) {
      const sysCountRes = await client.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM "SystemSetting"'
      );
      systemSettingCount = sysCountRes.rows[0]?.count ?? 0;
    }

    const hasAuditLog = tables.includes("AuditLog");
    let auditLogCount = 0;
    if (hasAuditLog) {
      const auditCountRes = await client.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM "AuditLog"'
      );
      auditLogCount = auditCountRes.rows[0]?.count ?? 0;
    }

    const hasUser = tables.includes("User");
    let userCount = 0;
    if (hasUser) {
      const userCountRes = await client.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM "User"'
      );
      userCount = userCountRes.rows[0]?.count ?? 0;
    }

    const hasDocument = tables.includes("Document");
    let documentCount = 0;
    if (hasDocument) {
      const docCountRes = await client.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM "Document"'
      );
      documentCount = docCountRes.rows[0]?.count ?? 0;
    }

    const hasProject = tables.includes("Project");
    let projectCount = 0;
    if (hasProject) {
      const projCountRes = await client.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM "Project"'
      );
      projectCount = projCountRes.rows[0]?.count ?? 0;
    }

    const report = {
      targetDbName,
      maskedUrl,
      exists: dbRes.rows.length > 0,
      size: dbRes.rows[0]?.size ?? "0 B",
      owner: ownerRes.rows[0]?.owner ?? "unknown",
      activeConnectionsCount: connRes.rows.length,
      tablesCount: tables.length,
      hasPrismaMigrations,
      migrationCount,
      latestMigration,
      hasSystemSetting,
      systemSettingCount,
      hasAuditLog,
      auditLogCount,
      hasUser,
      userCount,
      hasDocument,
      documentCount,
      hasProject,
      projectCount,
    };

    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("inspect-candidate-db.ts")) {
  inspectCandidateDb().catch((err) => {
    console.error("INSPECT_CANDIDATE_FAILED:", err.message);
    process.exitCode = 1;
  });
}
