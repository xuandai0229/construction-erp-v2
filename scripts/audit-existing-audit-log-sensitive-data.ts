import "dotenv/config";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const SENSITIVE_PATTERN = "password|token|authorization|secret|cookie|signed[ _-]?url|api[_-]?key|private[_-]?key|credential|otp|mfa|webhook|bearer|basic";

async function main() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL không tồn tại; không thể audit AuditLog read-only.");
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1, connectionTimeoutMillis: 5_000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const result = await client.query<{ action: string; entityType: string; count: string; firstSeen: Date; lastSeen: Date }>(
        `SELECT action, "entityType", count(*)::text AS count, min("createdAt") AS "firstSeen", max("createdAt") AS "lastSeen"
         FROM "AuditLog"
         WHERE COALESCE("beforeData", '') ~* $1 OR COALESCE("afterData", '') ~* $1
         GROUP BY action, "entityType"
         ORDER BY count(*) DESC, action, "entityType"`,
        [SENSITIVE_PATTERN],
      );
      await client.query("ROLLBACK");
      const total = result.rows.reduce((sum, row) => sum + Number(row.count), 0);
      console.log(JSON.stringify({ scanned: "AuditLog only", sensitiveSignalCount: total, groups: result.rows.map((row) => ({ action: row.action, entityType: row.entityType, count: Number(row.count), firstSeen: row.firstSeen, lastSeen: row.lastSeen })) }, null, 2));
      if (total > 0) process.exitCode = 1;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* no active transaction */ }
      throw error;
    } finally { client.release(); }
  } finally { await pool.end(); }
}

void main();
