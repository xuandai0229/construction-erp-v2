import { Client } from "pg";
import { URL } from "node:url";
import "dotenv/config";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";

const localQaHosts = new Set(["127.0.0.1", "localhost", "::1"]);

function approvedHosts(environment: NodeJS.ProcessEnv): ReadonlySet<string> {
  return new Set(
    (environment.QA_DATABASE_HOST_ALLOWLIST ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter((host) => host.length > 0),
  );
}

export function assertQaDatabaseCreationTarget(
  environment: NodeJS.ProcessEnv = process.env,
): URL {
  const rawQaUrl = environment.QA_DATABASE_URL;
  if (!rawQaUrl) {
    throw new Error("QA_DATABASE_URL must be explicitly supplied; it is never derived from DATABASE_URL");
  }

  const qa = new URL(rawQaUrl);
  const host = qa.hostname.toLowerCase();
  const allowed = approvedHosts(environment);
  const local = localQaHosts.has(host);
  if (!local && !allowed.has(host)) {
    throw new Error("QA database creation is limited to a local host or QA_DATABASE_HOST_ALLOWLIST");
  }
  if (!local && environment.QA_DATABASE_REMOTE_APPROVED !== "true") {
    throw new Error("remote QA database creation requires QA_DATABASE_REMOTE_APPROVED=true");
  }
  return qa;
}

async function run(): Promise<void> {
  const qa = assertQaDatabaseCreationTarget();
  const safe = assertSafeQaDatabase();
  const admin = new URL(qa);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const existing = await client.query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists", [safe.database]);
    if (existing.rows[0]?.exists) throw new Error(`QA database ${safe.database} already exists; refusing to reuse a non-empty or unknown target`);
    const identifier = `"${safe.database.replaceAll('"', '""')}"`;
    await client.query(`CREATE DATABASE ${identifier}`);
    console.log(JSON.stringify({ ...safe, created: true }));
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("create-isolated-qa-database.ts")) {
  void run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "unknown QA database creation failure");
    process.exitCode = 1;
  });
}
