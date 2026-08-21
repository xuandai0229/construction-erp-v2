import * as bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { DATASET_ID, ID_PREFIX } from "./constants";
import {
  assertSafeNonProductionDatabase,
  createDatabase,
  getDatabaseInfo,
} from "./database";
import {
  collectCreatedCounts,
  collectSequenceCounts,
  readManifest,
  storageFilesExist,
} from "./dataset-io";
import { CREATED_ID_MODELS } from "./model-registry";

type Check = { name: string; passed: boolean; detail: string };

function addCheck(checks: Check[], name: string, passed: boolean, detail: string) {
  checks.push({ name, passed, detail });
}

async function main() {
  const info = getDatabaseInfo();
  assertSafeNonProductionDatabase(info);
  const database = createDatabase();
  const checks: Check[] = [];

  try {
    const manifest = await readManifest();
    if (!manifest) throw new Error("Không tìm thấy manifest. Hãy chạy npm run test-data:seed trước.");
    addCheck(checks, "Manifest đúng database", manifest.database === info.name, `${manifest.database} / ${info.name}`);
    addCheck(checks, "Manifest đúng dataset", manifest.datasetId === DATASET_ID, manifest.datasetId);
    const registeredModels = new Set([
      ...CREATED_ID_MODELS,
      "Project",
      "SystemSetting",
      "SafetyReportPlanSequence",
      "SafetySelfAssessmentSequence",
      "EmployeeCodeSequence",
    ]);
    const schemaModels = Prisma.dmmf.datamodel.models.map((model) => model.name);
    const missingModels = schemaModels.filter((model) => !registeredModels.has(model as never));
    const staleModels = [...registeredModels].filter((model) => !schemaModels.includes(model));
    addCheck(
      checks,
      "Registry phủ 100% Prisma model",
      missingModels.length === 0 && staleModels.length === 0,
      missingModels.length || staleModels.length
        ? `missing=${missingModels.join(",")}; stale=${staleModels.join(",")}`
        : `${schemaModels.length}/${schemaModels.length} models`,
    );

    const [actualCounts, sequenceCounts, storage] = await Promise.all([
      collectCreatedCounts(database.prisma),
      collectSequenceCounts(database.prisma),
      storageFilesExist(manifest),
    ]);
    for (const model of CREATED_ID_MODELS) {
      const expected = manifest.createdCounts[model];
      const actual = actualCounts[model];
      addCheck(checks, `Count ${model}`, actual === expected, `${actual}/${expected}`);
      addCheck(checks, `Coverage ${model}`, expected > 0, `${expected} test rows`);
    }

    addCheck(checks, "SafetyReportPlanSequence", sequenceCounts.plan === 1, `${sequenceCounts.plan}/1`);
    addCheck(checks, "SafetySelfAssessmentSequence", sequenceCounts.assessment === 1, `${sequenceCounts.assessment}/1`);
    addCheck(checks, "EmployeeCodeSequence", sequenceCounts.employee === 1, `${sequenceCounts.employee}/1`);
    addCheck(checks, "Tất cả file vật lý tồn tại", storage.missing.length === 0, storage.missing.join(", ") || `${manifest.files.length} files`);
    addCheck(checks, "Kích thước file đúng manifest", storage.wrongSize.length === 0, storage.wrongSize.join(", ") || "OK");

    const projectIds = manifest.projects.map((project) => project.id);
    const projects = await database.prisma.project.findMany({
      where: { id: { in: projectIds }, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    addCheck(checks, "Bảo toàn công trình nguồn", projects.length === manifest.projects.length, `${projects.length}/${manifest.projects.length}`);
    const projectTruth = new Map(projects.map((project) => [project.id, project]));
    const changedProject = manifest.projects.find((source) => {
      const current = projectTruth.get(source.id);
      return !current || current.code !== source.code || current.name !== source.name;
    });
    addCheck(checks, "Không đổi mã/tên công trình", !changedProject, changedProject?.code ?? "OK");
    const settingsCount = await database.prisma.systemSetting.count();
    addCheck(checks, "SystemSetting được giữ nguyên/reuse", settingsCount >= 1, `${settingsCount} row(s)`);

    const perProjectModels = [
      ["FieldProgressItem", "projectId"],
      ["WBSItem", "projectId"],
      ["Document", "projectId"],
      ["SiteReport", "projectId"],
      ["MaterialItem", "projectId"],
      ["MaterialMovement", "projectId"],
      ["ProjectMaterialStock", "projectId"],
      ["MaterialProposal", "projectId"],
      ["ApprovalRequest", "projectId"],
      ["ProjectLocationNode", "projectId"],
      ["FieldMaterialRequest", "projectId"],
      ["ProjectMember", "projectId"],
      ["EmployeeProjectAssignment", "projectId"],
    ] as const;
    for (const [table, column] of perProjectModels) {
      const result = await database.prisma.$queryRawUnsafe<Array<{ projectId: string; count: bigint }>>(
        `SELECT "${column}" AS "projectId", COUNT(*)::bigint AS count FROM "${table}" WHERE "id" LIKE $1 AND "${column}" = ANY($2::text[]) GROUP BY "${column}"`,
        `${ID_PREFIX}%`,
        projectIds,
      );
      const covered = new Set(result.filter((row) => Number(row.count) > 0).map((row) => row.projectId));
      addCheck(checks, `${table} phủ mọi công trình`, covered.size === projectIds.length, `${covered.size}/${projectIds.length}`);
    }

    const workItems = await database.prisma.fieldProgressItem.findMany({
      where: { id: { startsWith: ID_PREFIX }, itemType: "WORK" },
      select: { id: true, designQuantity: true },
    });
    const progressEntries = await database.prisma.fieldProgressEntry.findMany({
      where: { id: { startsWith: ID_PREFIX }, deletedAt: null },
      select: { itemId: true, quantity: true, status: true },
    });
    const cumulative = new Map<string, number>();
    for (const entry of progressEntries) {
      if (entry.status === "CANCELLED") continue;
      cumulative.set(entry.itemId, (cumulative.get(entry.itemId) ?? 0) + Number(entry.quantity));
    }
    const overrun = workItems.filter((item) => Number(item.designQuantity ?? 0) + 0.0001 < (cumulative.get(item.id) ?? 0));
    addCheck(checks, "Không vượt khối lượng thiết kế", overrun.length === 0, overrun.map((item) => item.id).join(", ") || `${workItems.length} work items`);

    const movements = await database.prisma.materialMovement.findMany({
      where: { id: { startsWith: ID_PREFIX } },
      select: { materialItemId: true, type: true, quantity: true },
    });
    const stocks = await database.prisma.projectMaterialStock.findMany({
      where: { id: { startsWith: ID_PREFIX } },
      select: { materialItemId: true, stock: true, minStockLevel: true },
    });
    const ledger = new Map<string, number>();
    for (const movement of movements) {
      const sign = movement.type === "IMPORT" || movement.type === "RETURN" ? 1 : -1;
      ledger.set(movement.materialItemId, (ledger.get(movement.materialItemId) ?? 0) + sign * Number(movement.quantity));
    }
    const stockMismatch = stocks.filter((stock) => Math.abs(Number(stock.stock) - (ledger.get(stock.materialItemId) ?? 0)) > 0.001);
    addCheck(checks, "Tồn kho khớp sổ nhập xuất", stockMismatch.length === 0, stockMismatch.map((stock) => stock.materialItemId).join(", ") || `${stocks.length} stock rows`);
    addCheck(checks, "Có case tồn kho thấp", stocks.some((stock) => Number(stock.stock) < Number(stock.minStockLevel)), `${stocks.filter((stock) => Number(stock.stock) < Number(stock.minStockLevel)).length} low-stock rows`);

    const reportStatuses = await database.prisma.siteReport.groupBy({
      by: ["status"],
      where: { id: { startsWith: ID_PREFIX } },
      _count: { _all: true },
    });
    const reportStatusSet = new Set(reportStatuses.map((row) => row.status));
    addCheck(checks, "Đủ trạng thái báo cáo", ["DRAFT", "SUBMITTED", "APPROVED"].every((status) => reportStatusSet.has(status as never)), [...reportStatusSet].join(", "));
    const approvalStatuses = await database.prisma.approvalRequest.groupBy({
      by: ["status"],
      where: { id: { startsWith: ID_PREFIX } },
      _count: { _all: true },
    });
    const approvalStatusSet = new Set(approvalStatuses.map((row) => row.status));
    addCheck(checks, "Đủ trạng thái phê duyệt", ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].every((status) => approvalStatusSet.has(status as never)), [...approvalStatusSet].join(", "));

    const users = await database.prisma.user.findMany({
      where: { id: { startsWith: ID_PREFIX } },
      select: { id: true, role: true, password: true, isActive: true },
    });
    const roleSet = new Set(users.map((user) => user.role));
    addCheck(checks, "Đủ 9 UserRole", roleSet.size === 9, [...roleSet].join(", "));
    addCheck(checks, "Tất cả tài khoản test active", users.every((user) => user.isActive), `${users.filter((user) => user.isActive).length}/${users.length}`);
    const password = process.env.COMPLETE_TEST_DATA_PASSWORD?.trim() || process.env.SEED_DEV_TEST_PASSWORD?.trim();
    if (password) {
      const passwordResults = await Promise.all(users.map((user) => bcrypt.compare(password, user.password)));
      addCheck(checks, "Mật khẩu bcrypt kiểm thử được", passwordResults.every(Boolean), `${passwordResults.filter(Boolean).length}/${users.length}`);
    } else {
      addCheck(checks, "Mật khẩu bcrypt kiểm thử được", false, "Thiếu biến mật khẩu để compare");
    }

    const failed = checks.filter((check) => !check.passed);
    console.log(JSON.stringify({
      status: failed.length === 0 ? "PASS" : "FAIL",
      datasetId: DATASET_ID,
      database: info.name,
      projects: manifest.projects.length,
      records: Object.values(actualCounts).reduce((sum, count) => sum + count, 0),
      files: manifest.files.length,
      checks: checks.length,
      failed: failed.length,
      failures: failed,
    }, null, 2));
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
