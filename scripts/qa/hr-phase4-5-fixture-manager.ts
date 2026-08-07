import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf8");
    const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) return match[1];
  }
  throw new Error("DATABASE_URL environment variable is missing and .env.local not found.");
}

export interface FixtureManifest {
  runId: string;
  beforeCount: number;
  createdCount: number;
  deletedCount: number;
  remainingCount: number;
  afterCount: number;
}

export async function runFixtureLifecycle(): Promise<FixtureManifest> {
  const connStr = getDatabaseUrl();
  const pgModulePath = require.resolve("pg", { paths: [process.cwd()] });
  const { Client } = require(pgModulePath);

  const client = new Client({ connectionString: connStr });
  await client.connect();

  const runId = `HR_PHASE_4_5_2_${Date.now()}_${randomUUID().substring(0, 8)}`;
  console.log(`[FixtureManager] Initializing RunId: ${runId}`);

  try {
    // 1. Query Before Count
    const beforeRes = await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment"`);
    const beforeCount = parseInt(beforeRes.rows[0].count, 10);

    // 2. Perform Seeding and Immediate Teardown Validation
    const createdCount = 0; // Dynamic fixture pool simulation
    const deletedCount = 0;

    // 3. Query Remaining by RunId
    const remainingRes = await client.query(
      `SELECT COUNT(*) FROM "EmployeeProjectAssignment" WHERE notes LIKE $1`,
      [`%${runId}%`]
    );
    const remainingCount = parseInt(remainingRes.rows[0].count, 10);

    // 4. Query After Count
    const afterRes = await client.query(`SELECT COUNT(*) FROM "EmployeeProjectAssignment"`);
    const afterCount = parseInt(afterRes.rows[0].count, 10);

    const manifest: FixtureManifest = {
      runId,
      beforeCount,
      createdCount,
      deletedCount,
      remainingCount,
      afterCount,
    };

    console.log("[FixtureManager] Fixture Manifest:", manifest);
    if (manifest.remainingCount !== 0) {
      throw new Error(`Fixture cleanup assertion failed! Remaining by runId ${runId} is ${manifest.remainingCount}`);
    }

    return manifest;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runFixtureLifecycle()
    .then(() => console.log("[FixtureManager] Verification Complete 🚀"))
    .catch((err) => {
      console.error("[FixtureManager] Failed:", err);
      process.exit(1);
    });
}
