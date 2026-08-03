import "dotenv/config";
import { Client } from "pg";

function parseBaseUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export async function listDatabaseCandidates() {
  const primaryUrl = process.env.DATABASE_URL;
  if (!primaryUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const baseClientUrl = parseBaseUrl(primaryUrl);
  const client = new Client({ connectionString: baseClientUrl });

  await client.connect();
  try {
    const res = await client.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
    );
    const candidates = res.rows
      .map((r) => r.datname)
      .filter((name) => /(qa|test|e2e|sandbox)/i.test(name));

    console.log(JSON.stringify({ candidates }, null, 2));
    return candidates;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("list-safe-database-candidates.ts")) {
  listDatabaseCandidates().catch((err) => {
    console.error("LIST_CANDIDATES_FAILED:", err.message);
    process.exitCode = 1;
  });
}
