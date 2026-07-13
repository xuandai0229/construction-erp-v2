import "dotenv/config";
import { Pool } from "pg";
import { pathToFileURL } from "node:url";

export type DatabaseFingerprint = { host: string | null; port: number | null; database: string; user: string };
export type SafeQaDatabaseResult = {
  safe: boolean;
  reason: string;
  qaUrl?: { host: string; port: string; database: string };
  primaryUrl?: { host: string; port: string; database: string };
  qaFingerprint?: DatabaseFingerprint;
  primaryFingerprint?: DatabaseFingerprint;
};

type ParsedDatabaseUrl = { host: string; port: string; database: string };

export function parseDatabaseUrl(value: string | undefined): ParsedDatabaseUrl | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") return null;
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    return database ? { host: url.hostname, port: url.port || "5432", database } : null;
  } catch { return null; }
}

async function fingerprint(url: string): Promise<DatabaseFingerprint> {
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 2_000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const result = await client.query<{ database: string; user: string; host: string | null; port: number | null }>(
        "SELECT current_database() AS database, current_user AS user, inet_server_addr()::text AS host, inet_server_port() AS port",
      );
      await client.query("ROLLBACK");
      return result.rows[0];
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* transaction was never opened */ }
      throw error;
    } finally { client.release(); }
  } finally { await pool.end(); }
}

export async function assertSafeQaDatabase(options: {
  qaDatabaseUrl?: string;
  primaryDatabaseUrl?: string;
  confirmation?: string;
  sentinel?: string;
} = {}): Promise<SafeQaDatabaseResult> {
  const qaDatabaseUrl = options.qaDatabaseUrl ?? process.env.QA_DATABASE_URL;
  const primaryDatabaseUrl = options.primaryDatabaseUrl ?? process.env.DATABASE_URL;
  const qa = parseDatabaseUrl(qaDatabaseUrl);
  const primary = parseDatabaseUrl(primaryDatabaseUrl);
  if (!qa) return { safe: false, reason: "QA_DATABASE_URL không tồn tại hoặc không phải PostgreSQL URL hợp lệ." };
  if (!primary) return { safe: false, reason: "DATABASE_URL không xác định được; không thể chứng minh database QA tách biệt.", qaUrl: qa };
  if ((options.confirmation ?? process.env.ALLOW_QA_RBAC_MUTATIONS) !== "RBAC_QA_ONLY") return { safe: false, reason: "Thiếu ALLOW_QA_RBAC_MUTATIONS=RBAC_QA_ONLY.", qaUrl: qa, primaryUrl: primary };
  if ((options.sentinel ?? process.env.QA_RBAC_SENTINEL) !== "RBAC_QA_SENTINEL_V1") return { safe: false, reason: "Thiếu QA_RBAC_SENTINEL=RBAC_QA_SENTINEL_V1.", qaUrl: qa, primaryUrl: primary };
  if (!/(qa|test|testing|ci|sandbox)/i.test(qa.database)) return { safe: false, reason: "Tên database QA không có dấu hiệu qa, test, ci hoặc sandbox.", qaUrl: qa, primaryUrl: primary };
  if (qa.host === primary.host && qa.port === primary.port && qa.database === primary.database) return { safe: false, reason: "QA_DATABASE_URL trùng DATABASE_URL theo URL đã parse.", qaUrl: qa, primaryUrl: primary };

  let qaFingerprint: DatabaseFingerprint;
  let primaryFingerprint: DatabaseFingerprint;
  try {
    [qaFingerprint, primaryFingerprint] = await Promise.all([fingerprint(qaDatabaseUrl!), fingerprint(primaryDatabaseUrl!)]);
  } catch {
    return { safe: false, reason: "Không thể lấy fingerprint read-only của cả QA_DATABASE_URL và DATABASE_URL; không chạy fixture.", qaUrl: qa, primaryUrl: primary };
  }
  if (qaFingerprint.database === primaryFingerprint.database && qaFingerprint.host === primaryFingerprint.host && qaFingerprint.port === primaryFingerprint.port) {
    return { safe: false, reason: "Fingerprint kết nối cho thấy QA và database hiện hành là cùng một database.", qaUrl: qa, primaryUrl: primary, qaFingerprint, primaryFingerprint };
  }
  return { safe: true, reason: "QA database đã tách biệt, có naming convention, sentinel và xác nhận mutation hợp lệ.", qaUrl: qa, primaryUrl: primary, qaFingerprint, primaryFingerprint };
}

async function main() {
  const result = await assertSafeQaDatabase();
  // No password, query string, token, or credential is included in this output.
  console.log(JSON.stringify(result, null, 2));
  if (!result.safe) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
