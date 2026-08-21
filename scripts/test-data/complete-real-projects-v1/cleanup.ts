import fs from "node:fs/promises";
import {
  CLEANUP_CONFIRMATION,
  DATASET_ID,
  ID_PREFIX,
  SEQUENCE_YEAR,
} from "./constants";
import {
  assertSafeNonProductionDatabase,
  createDatabase,
  getDatabaseInfo,
} from "./database";
import {
  collectCreatedCounts,
  collectSequenceCounts,
  getDatasetStorageRoot,
  readManifest,
} from "./dataset-io";
import { CLEANUP_ID_MODEL_ORDER } from "./model-registry";

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(identifier)) {
    throw new Error(`Tên bảng không hợp lệ: ${identifier}`);
  }
  return `"${identifier}"`;
}

async function findExternalCascadeDependencies(
  prisma: ReturnType<typeof createDatabase>["prisma"],
) {
  const checks = [
    ["ProjectMember", "userId"],
    ["Notification", "userId"],
    ["ChatMessage", "senderId"],
    ["SupervisionScope", "userId"],
    ["SupervisionInspectionSchedule", "supervisorId"],
    ["UserAccessGrant", "userId"],
  ] as const;
  const dependencies: Array<{ table: string; count: number }> = [];
  for (const [table, userColumn] of checks) {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(userColumn)} LIKE $1 AND "id" NOT LIKE $1`,
      `${ID_PREFIX}%`,
    );
    const count = Number(result[0]?.count ?? 0);
    if (count > 0) dependencies.push({ table, count });
  }
  return dependencies;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const confirmationArg = process.argv.find((arg) => arg.startsWith("--confirm="));
  const confirmation = confirmationArg?.slice("--confirm=".length);
  const info = getDatabaseInfo();
  assertSafeNonProductionDatabase(info);
  const database = createDatabase();

  try {
    const manifest = await readManifest();
    const [counts, sequences, externalDependencies] = await Promise.all([
      collectCreatedCounts(database.prisma),
      collectSequenceCounts(database.prisma),
      findExternalCascadeDependencies(database.prisma),
    ]);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    let storageExists = true;
    try {
      await fs.access(getDatasetStorageRoot());
    } catch {
      storageExists = false;
    }

    const summary = {
      status: execute ? "EXECUTE_REQUESTED" : "DRY_RUN",
      datasetId: DATASET_ID,
      database: info.name,
      manifest: manifest?.createdAt ?? null,
      records: total,
      counts,
      sequences,
      storage: {
        path: getDatasetStorageRoot(),
        exists: storageExists,
      },
      externalDependencies,
      preserved: ["21+ Project records", "SystemSetting", "all non-tdv1 records"],
    };

    if (!execute) {
      console.log(JSON.stringify({
        ...summary,
        next: `npm run test-data:cleanup:execute (requires ${CLEANUP_CONFIRMATION})`,
      }, null, 2));
      return;
    }

    if (!manifest) {
      throw new Error("Từ chối cleanup execute vì thiếu manifest của dataset.");
    }
    if (manifest.database !== info.name) {
      throw new Error(
        `Manifest thuộc database ${manifest.database}, không phải ${info.name}.`,
      );
    }
    if (confirmation !== CLEANUP_CONFIRMATION) {
      throw new Error(
        `Thiếu xác nhận --confirm=${CLEANUP_CONFIRMATION}. Cleanup chưa chạy.`,
      );
    }
    if (externalDependencies.length > 0) {
      throw new Error(
        `Tài khoản test đang có bản ghi ngoài dataset: ${JSON.stringify(externalDependencies)}. Cleanup dừng để tránh xóa lan.`,
      );
    }

    await database.prisma.$transaction(async (tx) => {
      for (const model of CLEANUP_ID_MODEL_ORDER) {
        await tx.$executeRawUnsafe(
          `DELETE FROM ${quoteIdentifier(model)} WHERE "id" LIKE $1`,
          `${ID_PREFIX}%`,
        );
      }
      await tx.safetyReportPlanSequence.deleteMany({ where: { businessYear: SEQUENCE_YEAR } });
      await tx.safetySelfAssessmentSequence.deleteMany({ where: { businessYear: SEQUENCE_YEAR } });
      await tx.employeeCodeSequence.deleteMany({ where: { year: SEQUENCE_YEAR } });
    }, { maxWait: 30_000, timeout: 180_000 });

    await fs.rm(getDatasetStorageRoot(), { recursive: true, force: true });
    const remainingCounts = await collectCreatedCounts(database.prisma);
    const remaining = Object.values(remainingCounts).reduce((sum, count) => sum + count, 0);
    if (remaining !== 0) {
      throw new Error(`Cleanup DB chưa sạch: còn ${remaining} bản ghi ${ID_PREFIX}.`);
    }

    console.log(JSON.stringify({
      status: "DELETED",
      datasetId: DATASET_ID,
      database: info.name,
      deletedRecords: total,
      storageDeleted: storageExists,
      preserved: ["Project", "SystemSetting", "all non-tdv1 records"],
    }, null, 2));
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

