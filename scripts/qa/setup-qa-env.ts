/**
 * Test Database Safety Guard & Environment Configurator
 * Prevents mutation / E2E tests from accidentally running against primary development or production databases.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export type CanonicalDatabaseTarget = {
  protocol: string;
  host: string;
  port: string;
  database: string;
  schema: string;
};

export function parseCanonicalDatabaseTarget(connectionString: string): CanonicalDatabaseTarget {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch (err) {
    throw new Error(`SAFETY VIOLATION: Invalid database connection URL string.`);
  }

  const rawHost = parsed.hostname.toLowerCase();
  let normalizedHost = rawHost;
  if (rawHost === "localhost" || rawHost === "[::1]" || rawHost === "127.0.0.1") {
    normalizedHost = "127.0.0.1";
  }

  const port = parsed.port || "5432";
  const rawDb = parsed.pathname.replace(/^\//, "");
  const schema = parsed.searchParams.get("schema")?.toLowerCase() || "public";

  return {
    protocol: parsed.protocol.toLowerCase(),
    host: normalizedHost,
    port,
    database: rawDb,
    schema,
  };
}

export function maskConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.password) {
      url.password = "****";
    }
    if (url.username) {
      url.username = url.username;
    }
    return url.toString();
  } catch {
    return "[INVALID_URL]";
  }
}

export function validateQaDatabaseOrThrow(qaUrlInput?: string, mainUrlInput?: string): string {
  const qaUrl = (qaUrlInput ?? process.env.QA_DATABASE_URL)?.trim();
  const mainUrl = (mainUrlInput ?? process.env.DATABASE_URL)?.trim();

  if (!qaUrl) {
    throw new Error(
      "SAFETY VIOLATION: QA_DATABASE_URL is missing. Mutation and E2E tests MUST specify an isolated QA_DATABASE_URL environment variable."
    );
  }

  const qaTarget = parseCanonicalDatabaseTarget(qaUrl);

  if (!qaTarget.database) {
    throw new Error("SAFETY VIOLATION: Database name in QA_DATABASE_URL cannot be empty.");
  }

  const isProductionDb = /prod|production|main|master|live/i.test(qaTarget.database);
  if (isProductionDb) {
    throw new Error(
      `SAFETY VIOLATION: Database name '${qaTarget.database}' in QA_DATABASE_URL contains production keywords ('prod', 'production', 'main', 'master', 'live').`
    );
  }

  const isSafeDbName = /qa|test|e2e|sandbox/i.test(qaTarget.database);
  if (!isSafeDbName) {
    throw new Error(
      `SAFETY VIOLATION: Database name '${qaTarget.database}' in QA_DATABASE_URL does not contain mandatory safety keyword ('qa', 'test', 'e2e', or 'sandbox').`
    );
  }

  if (mainUrl) {
    try {
      const mainTarget = parseCanonicalDatabaseTarget(mainUrl);
      if (
        qaTarget.host === mainTarget.host &&
        qaTarget.port === mainTarget.port &&
        qaTarget.database === mainTarget.database &&
        qaTarget.schema === mainTarget.schema &&
        !hasQaSafetyKeyword(mainTarget.database)
      ) {
        throw new Error(
          "SAFETY VIOLATION: QA_DATABASE_URL targets the exact same canonical database & schema as non-QA DATABASE_URL. Mutation tests cannot run on production database."
        );
      }
    } catch (err: any) {
      if (err.message.startsWith("SAFETY VIOLATION:")) {
        throw err;
      }
    }
  }

  const maskedUrl = maskConnectionString(qaUrl);
  console.log(`[QA Guard] Target DB Verified Safe -> Host: ${qaTarget.host}, Port: ${qaTarget.port}, Database: ${qaTarget.database}, Schema: ${qaTarget.schema} (${maskedUrl})`);

  return qaUrl;
}

export function createQaPrismaClient(): { prisma: PrismaClient; pool: Pool } {
  const dbUrl = validateQaDatabaseOrThrow();
  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

export function createRunId(): string {
  return crypto.randomUUID();
}
