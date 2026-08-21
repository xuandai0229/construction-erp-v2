import fs from "node:fs/promises";
import * as bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { buildDataset, type SourceProject } from "./build-dataset";
import {
  DATASET_ID,
  ID_PREFIX,
  SEQUENCE_YEAR,
  makeId,
} from "./constants";
import {
  assertSafeNonProductionDatabase,
  createDatabase,
  getDatabaseInfo,
} from "./database";
import {
  collectCreatedCounts,
  getDatasetStorageRoot,
  readManifest,
  writeDatasetFiles,
  writeManifest,
} from "./dataset-io";
import type { CreatedIdModel } from "./model-registry";

const HIERARCHICAL_MODELS = new Set<CreatedIdModel>([
  "OrganizationUnit",
  "WBSItem",
  "ProjectLocationNode",
  "FieldProgressItem",
]);

const SEED_MODEL_ORDER: readonly CreatedIdModel[] = [
  "User",
  "OrganizationUnit",
  "Position",
  "ProjectPersonnelRole",
  "HrPermissionDefinition",
  "Employee",
  "EmployeeOrganizationAssignment",
  "OrganizationUnitManagerAssignment",
  "EmployeeProjectAssignment",
  "UserAccessGrant",
  "EmployeeChangeHistory",
  "ProjectMember",
  "WBSItem",
  "DocumentFolder",
  "FieldProgressTemplate",
  "ProjectLocationNode",
  "FieldProgressItem",
  "FieldProgressItemAssignment",
  "FieldProgressItemLocation",
  "SiteReport",
  "SiteReportLine",
  "FieldProgressEntry",
  "FieldMaterialRequest",
  "FieldMaterialRequestItem",
  "MaterialItem",
  "MaterialMovement",
  "ProjectMaterialStock",
  "MaterialProposal",
  "MaterialProposalItem",
  "MaterialProposalApproval",
  "ApprovalRequest",
  "Notification",
  "ChatMessage",
  "AuditLog",
  "Document",
  "SiteReportPhoto",
  "SiteReportAttachment",
  "SupervisionScope",
  "SupervisionScopeProject",
  "SupervisionWeeklyPackage",
  "SupervisionWorkflowHistory",
  "SupervisionAttachment",
  "SupervisionFinding",
  "SupervisionPlanItem",
  "SupervisionProgressAssessment",
  "SupervisionQuantityVerification",
  "SupervisionRecommendation",
  "SupervisionTransitionCheck",
  "SupervisionVisit",
  "SupervisionInspectionSchedule",
  "SupervisionWeeklyDossier",
  "SupervisionWeeklyShiftSelection",
  "SupervisionWeeklyEntry",
  "SupervisionWeeklyQuantity",
  "SupervisionWeeklyTransition",
  "SupervisionWeeklyProgress",
  "SupervisionWeeklyObservation",
  "SupervisionWeeklyAttachment",
  "SupervisionWeeklyRevision",
  "SafetyWeeklyFile",
  "SafetyReportPlan",
  "SafetyReportPlanEntry",
  "SafetySelfAssessmentReport",
  "SafetySelfAssessmentEntry",
  "SafetyReportApprovalHistory",
  "SafetyReportAuditLog",
];

function delegateName(model: CreatedIdModel): string {
  if (model === "WBSItem") return "wBSItem";
  return `${model[0].toLowerCase()}${model.slice(1)}`;
}

async function createRows(
  tx: Prisma.TransactionClient,
  model: CreatedIdModel,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  if (rows.length === 0) return;
  const delegate = (tx as unknown as Record<string, { createMany(args: unknown): Promise<unknown> }>)[
    delegateName(model)
  ];
  if (!delegate) throw new Error(`Không tìm thấy Prisma delegate cho ${model}`);

  if (!HIERARCHICAL_MODELS.has(model)) {
    await delegate.createMany({ data: rows });
    return;
  }

  const parentRows = rows.filter((row) => row.parentId == null);
  const childRows = rows.filter((row) => row.parentId != null);
  if (parentRows.length) await delegate.createMany({ data: parentRows });

  // Location tree has three levels; the remaining hierarchies have two.
  if (model === "ProjectLocationNode") {
    const parentIds = new Set(parentRows.map((row) => row.id));
    const levelOne = childRows.filter((row) => parentIds.has(row.parentId));
    const levelOneIds = new Set(levelOne.map((row) => row.id));
    const deeper = childRows.filter((row) => levelOneIds.has(row.parentId));
    if (levelOne.length) await delegate.createMany({ data: levelOne });
    if (deeper.length) await delegate.createMany({ data: deeper });
    return;
  }

  if (childRows.length) await delegate.createMany({ data: childRows });
}

async function loadSourceProjects(prisma: ReturnType<typeof createDatabase>["prisma"]): Promise<SourceProject[]> {
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] },
      externalSourceKey: { not: null },
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      investor: true,
      startDate: true,
      endDate: true,
      fieldProgressTemplates: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  return projects.map(({ fieldProgressTemplates, ...project }) => ({
    ...project,
    existingTemplateId: fieldProgressTemplates[0]?.id ?? null,
  }));
}

async function main() {
  const execute = process.argv.includes("--execute");
  const info = getDatabaseInfo();
  assertSafeNonProductionDatabase(info);
  const database = createDatabase();

  try {
    const projects = await loadSourceProjects(database.prisma);
    if (projects.length === 0) {
      throw new Error("Không tìm thấy công trình nguồn thật (externalSourceKey) để tạo dữ liệu test.");
    }

    const password =
      process.env.COMPLETE_TEST_DATA_PASSWORD?.trim() ||
      process.env.SEED_DEV_TEST_PASSWORD?.trim();
    if (!password || password.length < 12) {
      throw new Error(
        "Cần COMPLETE_TEST_DATA_PASSWORD hoặc SEED_DEV_TEST_PASSWORD dài ít nhất 12 ký tự.",
      );
    }

    const existingCounts = await collectCreatedCounts(database.prisma);
    const existingTotal = Object.values(existingCounts).reduce((sum, count) => sum + count, 0);
    const existingManifest = await readManifest();
    const markerUser = await database.prisma.user.findUnique({
      where: { id: makeId("user", "admin") },
      select: { id: true },
    });
    if (existingTotal > 0 || markerUser || existingManifest) {
      if (markerUser && existingManifest) {
        console.log(JSON.stringify({
          status: "DATASET_ALREADY_EXISTS",
          datasetId: DATASET_ID,
          database: info.name,
          records: existingTotal,
          manifest: existingManifest.createdAt,
          next: "npm run test-data:verify",
        }, null, 2));
        return;
      }
      throw new Error(
        `Phát hiện dataset ${ID_PREFIX} ở trạng thái chưa hoàn chỉnh. Hãy chạy verify và cleanup dry-run trước khi seed lại.`,
      );
    }

    const passwordHash = execute
      ? await bcrypt.hash(password, 10)
      : "$2b$10$DRY_RUN_PASSWORD_HASH_NOT_WRITTEN";
    const dataset = buildDataset(projects, passwordHash);
    const plannedCounts = Object.fromEntries(
      Object.entries(dataset.rows).map(([model, records]) => [model, records.length]),
    );

    if (!execute) {
      console.log(JSON.stringify({
        status: "DRY_RUN",
        datasetId: DATASET_ID,
        database: info.name,
        projects: projects.length,
        reusedTemplates: dataset.reusedTemplateIds.length,
        files: dataset.files.length,
        plannedCounts,
        next: "npm run test-data:seed",
      }, null, 2));
      return;
    }

    await writeDatasetFiles(dataset.files);
    try {
      await database.prisma.$transaction(async (tx) => {
        await tx.safetyReportPlanSequence.create({
          data: { businessYear: SEQUENCE_YEAR, nextNumber: 1 },
        });
        await tx.safetySelfAssessmentSequence.create({
          data: { businessYear: SEQUENCE_YEAR, nextNumber: 1 },
        });
        await tx.employeeCodeSequence.create({
          data: { year: SEQUENCE_YEAR, currentSequence: 0 },
        });
        for (const model of SEED_MODEL_ORDER) {
          await createRows(tx, model, dataset.rows[model]);
        }
      }, { maxWait: 30_000, timeout: 180_000 });
    } catch (error) {
      await fs.rm(getDatasetStorageRoot(), { recursive: true, force: true });
      throw error;
    }

    const manifest = await writeManifest({
      database: info.name,
      projects,
      rows: dataset.rows,
      reusedTemplateIds: dataset.reusedTemplateIds,
      files: dataset.files,
    });
    console.log(JSON.stringify({
      status: "CREATED",
      datasetId: DATASET_ID,
      database: info.name,
      projects: projects.length,
      reusedTemplates: dataset.reusedTemplateIds.length,
      files: dataset.files.length,
      records: Object.values(manifest.createdCounts).reduce((sum, count) => sum + count, 0),
      createdCounts: manifest.createdCounts,
      next: "npm run test-data:verify",
    }, null, 2));
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

