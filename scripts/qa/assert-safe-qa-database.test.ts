import assert from "node:assert/strict";
import { test } from "vitest";
import { assertSafeQaDatabase, evaluateQaDatabaseSafety } from "./assert-safe-qa-database";
import { assertQaDatabaseCreationTarget } from "./create-isolated-qa-database";

const environment = (qaDatabaseUrl: string): NodeJS.ProcessEnv => ({
  DATABASE_URL: "postgresql://app-user:secret@localhost:5432/construction_erp_v2",
  QA_DATABASE_URL: qaDatabaseUrl,
});

test("QA database guard accepts an explicit distinct local QA target without exposing credentials", () => {
  const target = assertSafeQaDatabase(
    environment("postgresql://qa-user:secret@127.0.0.1:5432/construction_erp_v2_qa_migration_recovery"),
  );

  assert.deepEqual(target, {
    safe: true,
    database: "construction_erp_v2_qa_migration_recovery",
    host: "127.0.0.1",
    port: "5432",
    productionDatabase: {
      database: "construction_erp_v2",
      host: "localhost",
      port: "5432",
    },
    qaDatabase: {
      database: "construction_erp_v2_qa_migration_recovery",
      host: "127.0.0.1",
      port: "5432",
    },
    reason: "isolated QA database name and target verified",
  });
});

test("QA database evaluator reports both sanitized fingerprints when targets are identical", () => {
  assert.deepEqual(evaluateQaDatabaseSafety(environment("postgresql://qa-user:secret@localhost:5432/construction_erp_v2")), {
    safe: false,
    productionDatabase: {
      database: "construction_erp_v2",
      host: "localhost",
      port: "5432",
    },
    qaDatabase: {
      database: "construction_erp_v2",
      host: "localhost",
      port: "5432",
    },
    reason: "QA_DATABASE_URL must identify a database distinct from DATABASE_URL",
  });
});

test("QA database guard rejects a production marker and the primary database", () => {
  assert.throws(
    () => assertSafeQaDatabase(environment("postgresql://qa-user:secret@localhost:5432/construction_erp_v2_production")),
    /prohibited production marker/,
  );
  assert.throws(
    () => assertSafeQaDatabase(environment("postgresql://qa-user:secret@localhost:5432/construction_erp_v2")),
    /distinct from DATABASE_URL/,
  );
});

test("QA database creation requires an explicit local or explicitly approved target", () => {
  assert.throws(
    () => assertQaDatabaseCreationTarget({ DATABASE_URL: "postgresql://app-user:secret@localhost:5432/construction_erp_v2" }),
    /must be explicitly supplied/,
  );
  assert.throws(
    () => assertQaDatabaseCreationTarget(environment("postgresql://qa-user:secret@qa.example.test:5432/construction_erp_v2_qa_e2e_20260723")),
    /limited to localhost/,
  );
  assert.equal(
    assertQaDatabaseCreationTarget(
      environment("postgresql://qa-user:secret@127.0.0.1:5432/construction_erp_v2_qa_e2e_20260723"),
    ).pathname,
    "/construction_erp_v2_qa_e2e_20260723",
  );
  assert.throws(
    () => assertQaDatabaseCreationTarget(
      environment("postgresql://qa-user:secret@127.0.0.1:5432/construction_erp_v2_qa_other"),
    ),
    /requires the fixed target/,
  );
});
