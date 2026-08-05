import { URL } from "node:url";
import "dotenv/config";
import { Client } from "pg";

export type DatabaseFingerprint = Readonly<{
  database: string;
  host: string;
  port: string;
}>;

export type SafeTarget = Readonly<{
  safe: true;
  database: string;
  host: string;
  port: string;
  productionDatabase: DatabaseFingerprint;
  qaDatabase: DatabaseFingerprint;
  reason: string;
}>;

export type QaDatabaseSafetyResult =
  | SafeTarget
  | Readonly<{
      safe: false;
      productionDatabase: DatabaseFingerprint | null;
      qaDatabase: DatabaseFingerprint | null;
      reason: string;
    }>;

function parse(value: string | undefined, name: string): URL {
  if (!value) throw new Error(`${name} is required`);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error(`${name} is not a valid PostgreSQL URL`);
  }
}

function databaseName(url: URL): string {
  const value = decodeURIComponent(url.pathname.replace(/^\//, "")).trim();
  if (!value) throw new Error("QA_DATABASE_URL has no database name");
  return value;
}

function endpoint(url: URL): DatabaseFingerprint {
  let h = url.hostname.toLowerCase();
  if (h === "localhost") h = "127.0.0.1";
  return {
    database: databaseName(url),
    host: h,
    port: url.port || "5432",
  };
}

export async function evaluateQaDatabaseSafety(environment: NodeJS.ProcessEnv = process.env): Promise<QaDatabaseSafetyResult> {
  let primaryTarget: DatabaseFingerprint | null = null;
  let qaTarget: DatabaseFingerprint | null = null;

  try {
    primaryTarget = endpoint(parse(environment.DATABASE_URL, "DATABASE_URL"));
    qaTarget = endpoint(parse(environment.QA_DATABASE_URL, "QA_DATABASE_URL"));
    const normalized = qaTarget.database.toLowerCase();

    if (
      primaryTarget.host === qaTarget.host &&
      primaryTarget.port === qaTarget.port &&
      primaryTarget.database === qaTarget.database
    ) {
      throw new Error("QA_DATABASE_URL must identify a database distinct from DATABASE_URL");
    }

    if (normalized.includes("settings") || normalized.includes("e2e_20260803")) {
      throw new Error("Cannot use Settings E2E database for HR QA");
    }

    if (/(prod|production|live|staging)/.test(normalized)) {
      throw new Error("QA database name contains a prohibited production marker");
    }

    if (!/(qa|test|e2e|ci|sandbox)/.test(normalized)) {
      throw new Error("QA database name must contain qa, test, e2e, ci, or sandbox");
    }

    // Role check
    const client = new Client({ connectionString: environment.QA_DATABASE_URL });
    await client.connect();
    try {
      const { rows } = await client.query(`
        SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
        FROM pg_roles
        WHERE rolname = current_user;
      `);
      if (rows.length > 0) {
        const row = rows[0];
        if (
          row.rolsuper ||
          row.rolcreatedb ||
          row.rolcreaterole ||
          row.rolreplication ||
          row.rolbypassrls
        ) {
          throw new Error("QA database role has elevated privileges");
        }
      } else {
        throw new Error("Could not determine current user roles");
      }
    } finally {
      await client.end();
    }

  } catch (error) {
    return {
      safe: false,
      productionDatabase: primaryTarget,
      qaDatabase: qaTarget,
      reason: error instanceof Error ? error.message : "unknown safety guard failure",
    };
  }

  return {
    safe: true,
    database: qaTarget.database,
    host: qaTarget.host,
    port: qaTarget.port,
    productionDatabase: primaryTarget,
    qaDatabase: qaTarget,
    reason: "isolated QA database name, target, and roles verified",
  };
}

export async function assertSafeQaDatabase(environment: NodeJS.ProcessEnv = process.env): Promise<SafeTarget> {
  const result = await evaluateQaDatabaseSafety(environment);
  if (!result.safe) throw new Error(result.reason);
  return result;
}

if (process.argv[1]?.endsWith("assert-safe-qa-database.ts")) {
  evaluateQaDatabaseSafety().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.safe) process.exitCode = 1;
  });
}
