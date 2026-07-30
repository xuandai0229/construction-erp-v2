import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import "dotenv/config";
import { Client } from "pg";
import {
  assertSafeQaDatabase,
  type SafeTarget,
} from "./assert-safe-qa-database";

type CommandEvidence = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

type RehearsalManifest = {
  runId: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
  sourceQa: Pick<SafeTarget, "database" | "host" | "port">;
  rehearsalDatabase: {
    database: string;
    host: string;
    port: string;
  };
  productionDatabase: SafeTarget["productionDatabase"];
  commands: CommandEvidence[];
  appliedMigrations: Array<{
    migrationName: string;
    checksum: string;
    finishedAt: string | null;
    rolledBackAt: string | null;
  }>;
  constraints: string[];
  partialUniqueIndexes: string[];
  migrateDeployPassed: boolean;
  migrateStatusClean: boolean;
  schemaDiffClean: boolean;
  schemaDiffRawExitCode: number | null;
  explainedDriftEntities: string[];
  unexpectedDriftEntities: string[];
  integrationPassed: boolean | null;
  databaseDropped: boolean;
  failure: string | null;
};

function requireSafeRehearsalName(database: string): void {
  if (
    !/^[a-z0-9_]+$/.test(database) ||
    !database.includes("_qa_safety_migration_rehearsal_")
  ) {
    throw new Error("Tên database rehearsal không đạt guard.");
  }
}

function sanitized(
  value: string,
  secrets: readonly string[],
): string {
  return secrets.reduce(
    (current, secret) =>
      secret ? current.split(secret).join("[REDACTED]") : current,
    value,
  );
}

async function runCommand(input: {
  label: string;
  executable: string;
  args: readonly string[];
  environment: NodeJS.ProcessEnv;
  secrets: readonly string[];
}): Promise<CommandEvidence> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.executable, input.args, {
      cwd: process.cwd(),
      env: input.environment,
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        command: input.label,
        exitCode: code ?? 1,
        stdout: sanitized(stdout.trim(), input.secrets),
        stderr: sanitized(stderr.trim(), input.secrets),
      });
    });
  });
}

async function terminateAndDrop(
  admin: Client,
  database: string,
): Promise<void> {
  requireSafeRehearsalName(database);
  await admin.query(
    `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()`,
    [database],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
}

async function main(): Promise<void> {
  const sourceQa = assertSafeQaDatabase();
  const qaUrlValue = process.env.QA_DATABASE_URL;
  if (!qaUrlValue) throw new Error("QA_DATABASE_URL is required");
  const sourceUrl = new URL(qaUrlValue);
  const runId = randomUUID();
  const rehearsalName =
    `construction_erp_v2_qa_safety_migration_rehearsal_${runId.replaceAll("-", "").slice(0, 10)}`.toLowerCase();
  requireSafeRehearsalName(rehearsalName);
  const rehearsalUrl = new URL(sourceUrl);
  rehearsalUrl.pathname = `/${rehearsalName}`;
  const rehearsalUrlValue = rehearsalUrl.toString();
  const password = decodeURIComponent(sourceUrl.password);
  const artifactPath = path.resolve(
    "artifacts/safety-inspection-template-analysis/slice1.5-migration-rehearsal-manifest.json",
  );
  const manifest: RehearsalManifest = {
    runId,
    startedAtUtc: new Date().toISOString(),
    completedAtUtc: null,
    sourceQa: {
      database: sourceQa.database,
      host: sourceQa.host,
      port: sourceQa.port,
    },
    rehearsalDatabase: {
      database: rehearsalName,
      host: sourceQa.host,
      port: sourceQa.port,
    },
    productionDatabase: sourceQa.productionDatabase,
    commands: [],
    appliedMigrations: [],
    constraints: [],
    partialUniqueIndexes: [],
    migrateDeployPassed: false,
    migrateStatusClean: false,
    schemaDiffClean: false,
    schemaDiffRawExitCode: null,
    explainedDriftEntities: [],
    unexpectedDriftEntities: [],
    integrationPassed: null,
    databaseDropped: false,
    failure: null,
  };

  const admin = new Client({ connectionString: qaUrlValue });
  let databaseCreated = false;
  try {
    await admin.connect();
    const existing = await admin.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datname = $1",
      [rehearsalName],
    );
    if (existing.rowCount !== 0) {
      throw new Error("Database rehearsal đã tồn tại trước khi chạy.");
    }
    await admin.query(`CREATE DATABASE "${rehearsalName}"`);
    databaseCreated = true;

    const guarded = assertSafeQaDatabase({
      ...process.env,
      QA_DATABASE_URL: rehearsalUrlValue,
    });
    if (guarded.database !== rehearsalName) {
      throw new Error("Guard rehearsal trả về sai database.");
    }

    const cliEnvironment = {
      ...process.env,
      DATABASE_URL: rehearsalUrlValue,
      QA_DATABASE_URL: rehearsalUrlValue,
    };
    const prismaCli = path.resolve("node_modules/prisma/build/index.js");
    const deploy = await runCommand({
      label: "npx prisma migrate deploy",
      executable: process.execPath,
      args: [prismaCli, "migrate", "deploy"],
      environment: cliEnvironment,
      secrets: [password, rehearsalUrlValue],
    });
    manifest.commands.push(deploy);
    if (deploy.exitCode !== 0) {
      throw new Error("prisma migrate deploy thất bại.");
    }
    manifest.migrateDeployPassed = true;

    const status = await runCommand({
      label: "npx prisma migrate status",
      executable: process.execPath,
      args: [prismaCli, "migrate", "status"],
      environment: cliEnvironment,
      secrets: [password, rehearsalUrlValue],
    });
    manifest.commands.push(status);
    if (status.exitCode !== 0) {
      throw new Error("prisma migrate status chưa sạch.");
    }
    manifest.migrateStatusClean = true;

    const diff = await runCommand({
      label:
        "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code",
      executable: process.execPath,
      args: [
        prismaCli,
        "migrate",
        "diff",
        "--from-config-datasource",
        "--to-schema",
        "prisma/schema.prisma",
        "--exit-code",
      ],
      environment: cliEnvironment,
      secrets: [password, rehearsalUrlValue],
    });
    manifest.commands.push(diff);
    manifest.schemaDiffRawExitCode = diff.exitCode;
    if (diff.exitCode !== 0 && diff.exitCode !== 2) {
      throw new Error("Không thể thực hiện schema diff.");
    }
    const driftEntities = [
      ...diff.stdout.matchAll(/Changed the `([^`]+)` table/g),
      ...diff.stdout.matchAll(/^\s+-\s+([A-Za-z][A-Za-z0-9_]*)$/gm),
    ].map((match) => match[1]);
    const allowedDriftEntities = new Set([
      "SafetyChecklistTemplate",
      "SafetyDocumentTemplate",
      "SupervisionAttachment",
      "SupervisionInspectionSchedule",
      "SupervisionInspectionStatus",
      "SupervisionProgressAssessment",
      "SupervisionQuantityVerification",
      "SupervisionRecommendation",
      "SupervisionTransitionCheck",
      "SupervisionWeeklyEntry",
      "SupervisionWeeklyObservation",
      "SupervisionWeeklyShiftSelection",
    ]);
    manifest.explainedDriftEntities = [
      ...new Set(
        driftEntities.filter((entity) => allowedDriftEntities.has(entity)),
      ),
    ].sort();
    manifest.unexpectedDriftEntities = [
      ...new Set(
        driftEntities.filter((entity) => !allowedDriftEntities.has(entity)),
      ),
    ].sort();
    manifest.schemaDiffClean =
      diff.exitCode === 0 || manifest.unexpectedDriftEntities.length === 0;
    if (!manifest.schemaDiffClean) {
      throw new Error("Schema drift ngoài allowlist chưa được giải thích.");
    }

    const verification = new Client({ connectionString: rehearsalUrlValue });
    await verification.connect();
    try {
      const migrations = await verification.query<{
        migration_name: string;
        checksum: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }>(
        `SELECT migration_name, checksum, finished_at, rolled_back_at
           FROM "_prisma_migrations"
          ORDER BY started_at`,
      );
      manifest.appliedMigrations = migrations.rows.map((row) => ({
        migrationName: row.migration_name,
        checksum: row.checksum,
        finishedAt: row.finished_at?.toISOString() ?? null,
        rolledBackAt: row.rolled_back_at?.toISOString() ?? null,
      }));
      const constraints = await verification.query<{ conname: string }>(
        `SELECT conname
           FROM pg_constraint
          WHERE conname LIKE 'Safety%'
          ORDER BY conname`,
      );
      manifest.constraints = constraints.rows.map((row) => row.conname);
      const indexes = await verification.query<{ indexname: string }>(
        `SELECT indexname
           FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'SafetyDocumentTemplate_one_active_per_type',
              'SafetyChecklistTemplate_one_active_per_code'
            )
          ORDER BY indexname`,
      );
      manifest.partialUniqueIndexes = indexes.rows.map(
        (row) => row.indexname,
      );
    } finally {
      await verification.end();
    }

    if (process.env.RUN_SAFETY_SLICE15_INTEGRATION === "true") {
      const integration = await runCommand({
        label:
          "npx tsx scripts/qa/safety-inspection-slice15.integration.ts",
        executable: process.execPath,
        args: [
          path.resolve("node_modules/tsx/dist/cli.mjs"),
          path.resolve(
            "scripts/qa/safety-inspection-slice15.integration.ts",
          ),
        ],
        environment: {
          ...process.env,
          QA_DATABASE_URL: rehearsalUrlValue,
        },
        secrets: [password, rehearsalUrlValue],
      });
      manifest.commands.push(integration);
      manifest.integrationPassed = integration.exitCode === 0;
      if (integration.exitCode !== 0) {
        throw new Error("Integration/concurrency suite thất bại.");
      }
    }
  } catch (error) {
    manifest.failure =
      error instanceof Error ? error.message : "Rehearsal thất bại không rõ.";
    process.exitCode = 1;
  } finally {
    if (databaseCreated) {
      try {
        await terminateAndDrop(admin, rehearsalName);
        manifest.databaseDropped = true;
      } catch (error) {
        manifest.failure ??=
          error instanceof Error
            ? `Cleanup database thất bại: ${error.message}`
            : "Cleanup database thất bại.";
        process.exitCode = 1;
      }
    }
    await admin.end().catch(() => undefined);
    manifest.completedAtUtc = new Date().toISOString();
    await writeFile(
      artifactPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    console.log(
      JSON.stringify({
        runId: manifest.runId,
        sourceQa: manifest.sourceQa,
        rehearsalDatabase: manifest.rehearsalDatabase,
        productionDatabase: manifest.productionDatabase,
        migrateDeployPassed: manifest.migrateDeployPassed,
        migrateStatusClean: manifest.migrateStatusClean,
        schemaDiffClean: manifest.schemaDiffClean,
        integrationPassed: manifest.integrationPassed,
        databaseDropped: manifest.databaseDropped,
        failure: manifest.failure,
        artifactPath,
      }),
    );
  }
}

void main();
