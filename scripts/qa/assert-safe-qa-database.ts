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
  reason: string;
}>;

function parse(value: string | undefined, name: string): URL {
  if (!value) throw new Error(`${name} is required`);
  try {
    return new URL(value);
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

export function assertSafeQaDatabase(environment: NodeJS.ProcessEnv = process.env): SafeTarget {
  const primary = parse(environment.DATABASE_URL, "DATABASE_URL");
  const qa = parse(environment.QA_DATABASE_URL, "QA_DATABASE_URL");
  const primaryTarget = endpoint(primary);
  const qaTarget = endpoint(qa);
  const primaryDatabase = primaryTarget.database;
  const qaDatabase = qaTarget.database;
  const normalized = qaDatabase.toLowerCase();
  if (!/(qa|test|sandbox)/.test(normalized)) throw new Error("QA database name must contain qa, test, or sandbox");
  if (/(prod|production|live|staging)/.test(normalized)) throw new Error("QA database name contains a prohibited production marker");
  if (
    primaryTarget.host === qaTarget.host &&
    primaryTarget.port === qaTarget.port &&
    primaryDatabase === qaDatabase
  ) {
    throw new Error("QA_DATABASE_URL must identify a database distinct from DATABASE_URL");
  }
  return {
    safe: true,
    database: qaDatabase,
    host: qaTarget.host,
    port: qaTarget.port,
    reason: "isolated QA database name and target verified",
  };
}

if (process.argv[1]?.endsWith("assert-safe-qa-database.ts")) {
  try {
    console.log(JSON.stringify(assertSafeQaDatabase()));
  } catch (error) {
    console.error(JSON.stringify({ safe: false, reason: error instanceof Error ? error.message : "unknown safety guard failure" }));
    process.exitCode = 1;
  }
}
