import "dotenv/config";
import { Client } from "pg";

export interface DatabaseGuardInfo {
  host: string;
  port: string;
  database: string;
  schema: string;
  maskedUser: string;
  isSafe: boolean;
  reason?: string;
}

export function parseDatabaseUrl(rawUrl: string): {
  protocol: string;
  username: string;
  host: string;
  port: string;
  database: string;
  schema: string;
} {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Invalid or missing database URL string.");
  }
  const parsed = new URL(rawUrl);
  const schema = parsed.searchParams.get("schema") || "public";
  const database = parsed.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("Database name missing in connection URL.");
  }
  return {
    protocol: parsed.protocol,
    username: parsed.username || "",
    host: parsed.hostname || "localhost",
    port: parsed.port || "5432",
    database,
    schema,
  };
}

export function validateDatabaseSafety(
  qaUrl: string | undefined,
  prodUrl: string | undefined
): DatabaseGuardInfo {
  if (!qaUrl || !qaUrl.trim()) {
    throw new Error(
      "SECURITY GUARD REJECTED: QA_DATABASE_URL environment variable is missing or empty. Fallback to DATABASE_URL is strictly prohibited."
    );
  }

  const qaParsed = parseDatabaseUrl(qaUrl);

  if (prodUrl && prodUrl.trim()) {
    const prodParsed = parseDatabaseUrl(prodUrl);
    const isSameHost =
      qaParsed.host === prodParsed.host ||
      (qaParsed.host === "127.0.0.1" && prodParsed.host === "localhost") ||
      (qaParsed.host === "localhost" && prodParsed.host === "127.0.0.1");

    if (
      isSameHost &&
      qaParsed.port === prodParsed.port &&
      qaParsed.database === prodParsed.database &&
      qaParsed.schema === prodParsed.schema
    ) {
      throw new Error(
        `SECURITY GUARD REJECTED: QA_DATABASE_URL points to the exact same target (${qaParsed.host}:${qaParsed.port}/${qaParsed.database}) as DATABASE_URL.`
      );
    }
  }

  const dbLower = qaParsed.database.toLowerCase();
  const forbiddenKeywords = ["prod", "production", "live", "main", "primary"];
  for (const kw of forbiddenKeywords) {
    if (dbLower.includes(kw)) {
      throw new Error(
        `SECURITY GUARD REJECTED: QA database name '${qaParsed.database}' contains forbidden production keyword '${kw}'.`
      );
    }
  }

  const safeKeywords = ["qa", "test", "sandbox", "ci", "dev"];
  const hasSafeKeyword = safeKeywords.some((kw) => dbLower.includes(kw));
  if (!hasSafeKeyword) {
    throw new Error(
      `SECURITY GUARD REJECTED: QA database name '${qaParsed.database}' must contain a recognized test identifier ('qa', 'test', 'sandbox', 'ci', or 'dev').`
    );
  }

  const maskedUser = qaParsed.username
    ? qaParsed.username.slice(0, 2) + "****"
    : "****";

  return {
    host: qaParsed.host,
    port: qaParsed.port,
    database: qaParsed.database,
    schema: qaParsed.schema,
    maskedUser,
    isSafe: true,
  };
}

export async function assertSafeDatabaseAudit(): Promise<DatabaseGuardInfo> {
  const qaUrl = process.env.QA_DATABASE_URL;
  const prodUrl = process.env.DATABASE_URL;

  const info = validateDatabaseSafety(qaUrl, prodUrl);

  // Runtime verification via direct PG Client
  const client = new Client({ connectionString: qaUrl });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT 
        current_database() as db,
        current_schema() as schema,
        current_user as db_user,
        inet_server_addr() as server_addr,
        inet_server_port() as server_port
    `);
    const row = res.rows[0];

    if (row.db !== info.database) {
      throw new Error(
        `SECURITY GUARD REJECTED: PostgreSQL runtime database name '${row.db}' does not match URL database name '${info.database}'.`
      );
    }

    console.log("================ DATABASE SAFETY GUARD ==================");
    console.log(`Target Host:     ${info.host}`);
    console.log(`Target Port:     ${info.port}`);
    console.log(`Database Name:   ${info.database}`);
    console.log(`Schema Name:     ${info.schema}`);
    console.log(`Masked User:     ${info.maskedUser}`);
    console.log(`PG Runtime DB:   ${row.db}`);
    console.log(`PG Runtime User: ${row.db_user}`);
    console.log("---------------------------------------------------------");
    console.log("-> DATABASE GUARD PASSED: SAFE QA/DEV DATABASE CONFIRMED.");
    console.log("=========================================================\n");

    return info;
  } catch (err: any) {
    throw new Error(`SECURITY GUARD RUNTIME CONNECTION FAILED: ${err.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

if (require.main === module) {
  assertSafeDatabaseAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
