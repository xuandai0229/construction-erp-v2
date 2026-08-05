import { URL } from "node:url";
import "dotenv/config";

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
  return {
    database: databaseName(url),
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
  };
}

export function evaluateQaDatabaseSafety(environment: NodeJS.ProcessEnv = process.env): QaDatabaseSafetyResult {
  let primaryTarget: DatabaseFingerprint | null = null;
  let qaTarget: DatabaseFingerprint | null = null;

  try {
    primaryTarget = endpoint(parse(environment.DATABASE_URL, "DATABASE_URL"));
    qaTarget = endpoint(parse(environment.QA_DATABASE_URL, "QA_DATABASE_URL"));
    const normalized = qaTarget.database.toLowerCase();
    if (/(prod|production|live|staging)/.test(normalized)) {
      throw new Error("QA database name contains a prohibited production marker");
    }
    if (
      primaryTarget.host === qaTarget.host &&
      primaryTarget.port === qaTarget.port &&
      primaryTarget.database === qaTarget.database
    ) {
      throw new Error("QA_DATABASE_URL must identify a database distinct from DATABASE_URL");
    }
    if (!/(qa|test|e2e|ci|sandbox)/.test(normalized)) {
      throw new Error("QA database name must contain qa, test, e2e, ci, or sandbox");
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
    reason: "isolated QA database name and target verified",
  };
}

export function assertSafeQaDatabase(environment: NodeJS.ProcessEnv = process.env): SafeTarget {
  const result = evaluateQaDatabaseSafety(environment);
  if (!result.safe) throw new Error(result.reason);
  return result;
}

if (process.argv[1]?.endsWith("assert-safe-qa-database.ts")) {
  const result = evaluateQaDatabaseSafety();
  console.log(JSON.stringify(result, null, 2));
  if (!result.safe) process.exitCode = 1;
}
