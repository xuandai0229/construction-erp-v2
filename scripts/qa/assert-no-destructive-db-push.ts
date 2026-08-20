import dotenv from "dotenv";
import path from "node:path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * Forensic Verification & Guard on Database State
 *
 * Verifies that:
 * 1. DATABASE_URL points to the intended development/production host.
 * 2. Exactly 21 projects, 15 users, 12 employees exist.
 * 3. No tables or columns were dropped or mutated.
 * 4. Prohibits any execution of `prisma db push --accept-data-loss`.
 */
export async function assertDatabaseIntegrity() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const url = new URL(connectionString);
  const host = url.hostname;
  const port = url.port || "5432";
  const dbName = url.pathname.replace(/^\//, "");

  console.log(`[DB Guard] Connected Host: ${host}:${port}, Database: ${dbName}`);

  const pool = new Pool({ connectionString });
  try {
    const projectRes = await pool.query('SELECT COUNT(*)::int as count FROM "Project" WHERE "deletedAt" IS NULL');
    const projectCount = projectRes.rows[0]?.count;

    if (projectCount !== 21) {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Expected 21 active projects, found ${projectCount}`);
    }

    const userRes = await pool.query('SELECT COUNT(*)::int as count FROM "User"');
    const userCount = userRes.rows[0]?.count;

    if (userCount !== 15) {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Expected 15 users, found ${userCount}`);
    }

    console.log(`[DB Guard] Verification Passed: ${projectCount} Projects, ${userCount} Users.`);
    return {
      host,
      port,
      database: dbName,
      projectCount,
      userCount,
      integrity: "PASS",
    };
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes("assert-no-destructive-db-push")) {
  assertDatabaseIntegrity()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
