import "dotenv/config";
import { Client } from "pg";

export interface TargetSummary {
  protocol: string;
  host: string;
  port: string;
  database: string;
}

export function parseAndNormalizeUrl(rawUrl: string | undefined, paramName: string): TargetSummary {
  if (!rawUrl || !rawUrl.trim()) {
    throw new Error(`${paramName} is required and cannot be empty.`);
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error(`${paramName} is not a valid URL.`);
  }

  const protocol = url.protocol.replace(/:$/, "").toLowerCase();
  if (protocol !== "postgresql" && protocol !== "postgres") {
    throw new Error(`${paramName} protocol must be 'postgresql' or 'postgres'.`);
  }

  const host = (url.hostname || "localhost").toLowerCase();
  const normalizedHost = host === "127.0.0.1" ? "localhost" : host;
  const port = url.port || "5432";
  const database = decodeURIComponent(url.pathname.replace(/^\//, "")).trim();

  if (!database) {
    throw new Error(`${paramName} database name cannot be empty.`);
  }

  return { protocol, host: normalizedHost, port, database };
}

export function validatePreflightTarget(
  preflightUrl: string | undefined,
  primaryUrl: string | undefined,
  allowPrimary = process.env.ALLOW_PRIMARY_READONLY_PREFLIGHT === "true"
): TargetSummary {
  if (!preflightUrl || !preflightUrl.trim()) {
    throw new Error(
      "SETTINGS_PREFLIGHT_DATABASE_URL is required. Silent fallback to DATABASE_URL is strictly prohibited."
    );
  }

  const target = parseAndNormalizeUrl(preflightUrl, "SETTINGS_PREFLIGHT_DATABASE_URL");

  const forbiddenDbs = ["postgres", "template0", "template1"];
  if (forbiddenDbs.includes(target.database.toLowerCase())) {
    throw new Error(`Target database '${target.database}' is a system template/admin database.`);
  }

  if (primaryUrl && primaryUrl.trim()) {
    const primaryTarget = parseAndNormalizeUrl(primaryUrl, "DATABASE_URL");
    const isSameTarget =
      target.host === primaryTarget.host &&
      target.port === primaryTarget.port &&
      target.database === primaryTarget.database;

    if (isSameTarget && !allowPrimary) {
      throw new Error(
        `SETTINGS_PREFLIGHT_DATABASE_URL targets the primary DATABASE_URL (${target.host}:${target.port}/${target.database}). Set ALLOW_PRIMARY_READONLY_PREFLIGHT=true to explicitly allow read-only preflight on primary database.`
      );
    }
  }

  if (!allowPrimary) {
    const dbLower = target.database.toLowerCase();
    const safeKeywords = ["qa", "test", "e2e", "sandbox"];
    const isSafe = safeKeywords.some((kw) => dbLower.includes(kw));
    if (!isSafe) {
      throw new Error(
        `Target database '${target.database}' must contain a recognized E2E/test identifier ('qa', 'test', 'e2e', or 'sandbox').`
      );
    }
  }

  return target;
}

export async function runSettingsReadonlyPreflight(preflightUrl?: string, primaryUrl?: string) {
  const targetUrl = preflightUrl || process.env.SETTINGS_PREFLIGHT_DATABASE_URL;
  const mainDbUrl = primaryUrl || process.env.DATABASE_URL;

  const target = validatePreflightTarget(targetUrl, mainDbUrl);

  const client = new Client({ connectionString: targetUrl });
  try {
    await client.connect();
  } catch (err) {
    return {
      target,
      databaseExists: false,
      schemaExists: false,
      systemSettingTableExists: false,
      auditLogTableExists: false,
      prismaMigrationsTableExists: false,
      migrationCount: 0,
      latestMigration: null,
      systemSettingCount: 0,
      systemSettingManifest: [],
      auditLogCount: 0,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }

  try {
    const regCheck = await client.query<{
      sys_reg: string | null;
      audit_reg: string | null;
      mig_reg: string | null;
    }>(`
      SELECT 
        to_regclass('"SystemSetting"')::text as sys_reg,
        to_regclass('"AuditLog"')::text as audit_reg,
        to_regclass('"_prisma_migrations"')::text as mig_reg
    `);

    const sysReg = regCheck.rows[0]?.sys_reg;
    const auditReg = regCheck.rows[0]?.audit_reg;
    const migReg = regCheck.rows[0]?.mig_reg;

    const systemSettingTableExists = !!sysReg;
    const auditLogTableExists = !!auditReg;
    const prismaMigrationsTableExists = !!migReg;
    const schemaExists = systemSettingTableExists || auditLogTableExists || prismaMigrationsTableExists;

    let migrationCount = 0;
    let latestMigration: string | null = null;
    if (prismaMigrationsTableExists) {
      const migCountRes = await client.query<{ count: number }>(
        'SELECT COUNT(*)::int as count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL'
      );
      migrationCount = migCountRes.rows[0]?.count ?? 0;

      const latestMigRes = await client.query<{ migration_name: string }>(
        'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1'
      );
      latestMigration = latestMigRes.rows[0]?.migration_name ?? null;
    }

    let systemSettingCount = 0;
    let systemSettingManifest: Array<{ id: string; version: number; updatedAt: Date }> = [];
    if (systemSettingTableExists) {
      const countRes = await client.query<{ count: number }>('SELECT COUNT(*)::int as count FROM "SystemSetting"');
      systemSettingCount = countRes.rows[0]?.count ?? 0;

      const manifestRes = await client.query<{ id: string; version: number; updatedAt: Date }>(
        'SELECT id, version, "updatedAt" FROM "SystemSetting" ORDER BY "createdAt" ASC LIMIT 20'
      );
      systemSettingManifest = manifestRes.rows;

      if (systemSettingCount > 1) {
        throw new Error(
          `SINGLETON_CONFLICT: SystemSetting table contains ${systemSettingCount} rows. Expected 0 or 1.`
        );
      }
    }

    let auditLogCount = 0;
    let automatedAuditCount = 0;
    if (auditLogTableExists) {
      const auditRes = await client.query<{ count: number }>('SELECT COUNT(*)::int as count FROM "AuditLog"');
      auditLogCount = auditRes.rows[0]?.count ?? 0;
      const automatedAuditRes = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM "AuditLog" WHERE "afterData" LIKE '%"source":"AUTOMATED_TEST"%'`,
      );
      automatedAuditCount = automatedAuditRes.rows[0]?.count ?? 0;
    }

    const fixtureUsers = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "User" WHERE email ILIKE 'settings_e2e_%'`,
    );
    const runDocuments = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Document" WHERE "originalName" ILIKE '%RUN_%'`,
    );
    const runProjects = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM "Project" WHERE code ILIKE 'SETTINGS_E2E_%'`,
    );

    const manifest = {
      target,
      databaseExists: true,
      schemaExists,
      systemSettingTableExists,
      auditLogTableExists,
      prismaMigrationsTableExists,
      migrationCount,
      latestMigration,
      systemSettingCount,
      systemSettingManifest,
      auditLogCount,
      automatedAuditCount,
      settingsFixtureUserCount: fixtureUsers.rows[0]?.count ?? 0,
      settingsRunDocumentCount: runDocuments.rows[0]?.count ?? 0,
      settingsRunProjectCount: runProjects.rows[0]?.count ?? 0,
    };

    return manifest;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("settings-readonly-preflight.ts")) {
  runSettingsReadonlyPreflight()
    .then((manifest) => {
      console.log(JSON.stringify(manifest, null, 2));
    })
    .catch((error) => {
      console.error(
        "SETTINGS_READONLY_PREFLIGHT_FAILED:",
        error instanceof Error ? error.message : "Unknown error"
      );
      process.exitCode = 1;
    });
}
