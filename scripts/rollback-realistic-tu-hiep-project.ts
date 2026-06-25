import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { Pool } from "pg";

dotenv.config();

const PROJECT_CODE = "QA-TUHIEP-5F-001";
const QA_STORAGE_SEGMENT = "qa-realistic-tu-hiep";
const QA_EMAILS = [
  "qa.admin.tuhiep@example.test",
  "qa.director.tuhiep@example.test",
  "qa.commander.tuhiep@example.test",
  "qa.engineer.tuhiep@example.test",
  "qa.accountant.tuhiep@example.test",
  "qa.viewer.tuhiep@example.test",
  "qa.outsider@example.test",
];

const args = new Set(process.argv.slice(2));
const shouldExecute = args.has("--execute");
const isDryRun = args.has("--dry-run") || !shouldExecute;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_QA_REALISTIC_ROLLBACK_PRODUCTION !== "true") {
  throw new Error("Refusing production rollback without ALLOW_QA_REALISTIC_ROLLBACK_PRODUCTION=true");
}

const connectionString = requireEnv("DATABASE_URL");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const storageRoot = process.env.STORAGE_ROOT || path.join(process.cwd(), "storage");
const qaStorageRelative = path.join("storage", QA_STORAGE_SEGMENT);
const qaStorageAbsolute = path.join(process.cwd(), qaStorageRelative);
const localStorageQaAbsolute = path.join(storageRoot, QA_STORAGE_SEGMENT);

function isSafeQaStoragePath(inputPath: string): boolean {
  if (!inputPath || inputPath.includes("..") || inputPath.includes("\0")) return false;
  const normalized = inputPath.replace(/\\/g, "/");
  return normalized.includes(QA_STORAGE_SEGMENT);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

type RollbackPlan = {
  projectId?: string;
  counts: Record<string, number>;
  qaUsersToDelete: Array<{ id: string; email: string }>;
  qaUsersSkipped: Array<{ id: string; email: string; reason: string }>;
  storageDirs: string[];
  unsafeStoragePaths: string[];
};

async function getSafeQaUsers(projectId: string) {
  const qaUsers = await prisma.user.findMany({
    where: { email: { in: QA_EMAILS } },
    include: {
      projectMembers: { select: { projectId: true } },
      assignedProjectMembers: { select: { projectId: true } },
      auditLogs: { select: { projectId: true, entityType: true, entityId: true } },
      messages: { select: { id: true } },
      createdSiteReports: { select: { projectId: true } },
      approvedSiteReports: { select: { projectId: true } },
      createdWBSItems: { select: { projectId: true } },
      materialRequests: { select: { projectId: true } },
      approvalRequests: { select: { id: true } },
      approvals: { select: { id: true } },
      documents: { select: { projectId: true } },
      createdFieldTemplates: { select: { projectId: true } },
      createdFieldItems: { select: { projectId: true } },
      createdFieldEntries: { select: { projectId: true } },
      approvedFieldEntries: { select: { projectId: true } },
      fieldMaterialRequests: { select: { projectId: true } },
    },
  });

  const toDelete: Array<{ id: string; email: string }> = [];
  const skipped: Array<{ id: string; email: string; reason: string }> = [];

  for (const user of qaUsers) {
    const outsideReasons: string[] = [];
    const hasOutsideProject = (records: Array<{ projectId: string | null }>, label: string) => {
      if (records.some((record) => record.projectId !== projectId)) outsideReasons.push(label);
    };

    hasOutsideProject(user.projectMembers, "projectMembers outside QA project");
    hasOutsideProject(user.assignedProjectMembers, "assignedProjectMembers outside QA project");
    hasOutsideProject(user.createdSiteReports, "createdSiteReports outside QA project");
    hasOutsideProject(user.approvedSiteReports, "approvedSiteReports outside QA project");
    hasOutsideProject(user.createdWBSItems, "createdWBSItems outside QA project");
    hasOutsideProject(user.materialRequests, "materialRequests outside QA project");
    hasOutsideProject(user.documents, "documents outside QA project");
    hasOutsideProject(user.createdFieldTemplates, "createdFieldTemplates outside QA project");
    hasOutsideProject(user.createdFieldItems, "createdFieldItems outside QA project");
    hasOutsideProject(user.createdFieldEntries, "createdFieldEntries outside QA project");
    hasOutsideProject(user.approvedFieldEntries, "approvedFieldEntries outside QA project");
    hasOutsideProject(user.fieldMaterialRequests, "fieldMaterialRequests outside QA project");
    if (user.auditLogs.some((log) => log.projectId !== projectId && log.projectId !== null)) {
      outsideReasons.push("auditLogs outside QA project");
    }
    if (user.auditLogs.some((log) => log.projectId === null && log.entityId !== user.id)) {
      outsideReasons.push("auditLogs without QA project scope");
    }
    if (user.messages.length > 0) outsideReasons.push("chat messages");
    if (user.approvalRequests.length > 0) outsideReasons.push("approval requests");
    if (user.approvals.length > 0) outsideReasons.push("approval approvals");

    if (outsideReasons.length > 0) {
      skipped.push({ id: user.id, email: user.email, reason: outsideReasons.join("; ") });
    } else {
      toDelete.push({ id: user.id, email: user.email });
    }
  }

  return { toDelete, skipped };
}

async function buildRollbackPlan(): Promise<RollbackPlan> {
  const project = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  if (!project) {
    return {
      counts: {},
      qaUsersToDelete: [],
      qaUsersSkipped: [],
      storageDirs: [qaStorageAbsolute, localStorageQaAbsolute],
      unsafeStoragePaths: [],
    };
  }

  const reportIds = (await prisma.siteReport.findMany({ where: { projectId: project.id }, select: { id: true } })).map((item) => item.id);
  const documentIds = (await prisma.document.findMany({ where: { projectId: project.id }, select: { id: true, storagePath: true } })).map((item) => item.id);
  const materialRequestIds = (await prisma.materialRequest.findMany({ where: { projectId: project.id }, select: { id: true } })).map((item) => item.id);
  const fieldTemplateIds = (await prisma.fieldProgressTemplate.findMany({ where: { projectId: project.id }, select: { id: true } })).map((item) => item.id);
  const fieldItemIds = (await prisma.fieldProgressItem.findMany({ where: { projectId: project.id }, select: { id: true } })).map((item) => item.id);
  const fieldEntryIds = (await prisma.fieldProgressEntry.findMany({ where: { projectId: project.id }, select: { id: true } })).map((item) => item.id);
  const fieldMaterialRequestIds = (await prisma.fieldMaterialRequest.findMany({ where: { projectId: project.id }, select: { id: true } })).map((item) => item.id);

  const attachments = await prisma.siteReportAttachment.findMany({
    where: { reportId: { in: reportIds } },
    select: { storagePath: true },
  });
  const documents = await prisma.document.findMany({
    where: { projectId: project.id },
    select: { storagePath: true },
  });
  const unsafeStoragePaths = [...attachments.map((item) => item.storagePath), ...documents.map((item) => item.storagePath)]
    .filter((storagePath) => !isSafeQaStoragePath(storagePath));

  const safeUsers = await getSafeQaUsers(project.id);

  return {
    projectId: project.id,
    counts: {
      siteReportAttachments: await prisma.siteReportAttachment.count({ where: { reportId: { in: reportIds } } }),
      siteReportPhotos: await prisma.siteReportPhoto.count({ where: { reportId: { in: reportIds } } }),
      siteReportLines: await prisma.siteReportLine.count({ where: { siteReportId: { in: reportIds } } }),
      siteReports: await prisma.siteReport.count({ where: { projectId: project.id } }),
      documents: await prisma.document.count({ where: { projectId: project.id } }),
      documentFolders: await prisma.documentFolder.count({ where: { projectId: project.id } }),
      materialRequestItems: await prisma.materialRequestItem.count({ where: { materialRequestId: { in: materialRequestIds } } }),
      materialRequests: await prisma.materialRequest.count({ where: { projectId: project.id } }),
      fieldMaterialRequestItems: await prisma.fieldMaterialRequestItem.count({ where: { requestId: { in: fieldMaterialRequestIds } } }),
      fieldMaterialRequests: await prisma.fieldMaterialRequest.count({ where: { projectId: project.id } }),
      fieldProgressEntries: await prisma.fieldProgressEntry.count({ where: { projectId: project.id } }),
      fieldProgressItems: await prisma.fieldProgressItem.count({ where: { projectId: project.id } }),
      fieldProgressTemplates: await prisma.fieldProgressTemplate.count({ where: { projectId: project.id } }),
      projectMembers: await prisma.projectMember.count({ where: { projectId: project.id } }),
      auditLogs: await prisma.auditLog.count({
        where: {
          OR: [
            { projectId: project.id },
            { entityId: project.id },
            { entityId: { in: reportIds } },
            { entityId: { in: documentIds } },
            { entityId: { in: materialRequestIds } },
            { entityId: { in: fieldTemplateIds } },
            { entityId: { in: fieldItemIds } },
            { entityId: { in: fieldEntryIds } },
          ],
        },
      }),
      project: 1,
      qaUsersToDelete: safeUsers.toDelete.length,
      qaUsersSkipped: safeUsers.skipped.length,
    },
    qaUsersToDelete: safeUsers.toDelete,
    qaUsersSkipped: safeUsers.skipped,
    storageDirs: [qaStorageAbsolute, localStorageQaAbsolute],
    unsafeStoragePaths,
  };
}

async function printPlan(plan: RollbackPlan) {
  console.log("=== REALISTIC TU HIEP ROLLBACK DRY RUN ===");
  console.log(`Mode: ${shouldExecute ? "EXECUTE" : "DRY_RUN"}`);
  console.log(`Project code: ${PROJECT_CODE}`);
  console.log(`Project id: ${plan.projectId || "(not found)"}`);
  console.log("Records scoped for deletion:");
  console.log(JSON.stringify(plan.counts, null, 2));
  console.log("QA users to delete:");
  console.log(JSON.stringify(plan.qaUsersToDelete, null, 2));
  console.log("QA users skipped because of external links:");
  console.log(JSON.stringify(plan.qaUsersSkipped, null, 2));
  console.log("Storage directories scoped for deletion:");
  for (const dir of Array.from(new Set(plan.storageDirs))) {
    console.log(`- ${dir} (${await pathExists(dir) ? "exists" : "missing"})`);
  }
  if (plan.unsafeStoragePaths.length > 0) {
    console.log("UNSAFE storage paths found; execute will abort:");
    for (const storagePath of plan.unsafeStoragePaths) console.log(`- ${storagePath}`);
  }
  if (!shouldExecute) {
    console.log("No data deleted. Pass --execute to delete only this QA data set.");
  }
}

async function executeRollback(plan: RollbackPlan) {
  if (!plan.projectId) {
    console.log("Project does not exist; only storage cleanup would be possible. Nothing deleted from DB.");
    return;
  }
  if (plan.unsafeStoragePaths.length > 0) {
    throw new Error("Rollback aborted because at least one QA document/attachment path is outside the QA storage scope.");
  }

  const projectId = plan.projectId;
  const reportIds = (await prisma.siteReport.findMany({ where: { projectId }, select: { id: true } })).map((item) => item.id);
  const materialRequestIds = (await prisma.materialRequest.findMany({ where: { projectId }, select: { id: true } })).map((item) => item.id);
  const fieldMaterialRequestIds = (await prisma.fieldMaterialRequest.findMany({ where: { projectId }, select: { id: true } })).map((item) => item.id);
  const documentIds = (await prisma.document.findMany({ where: { projectId }, select: { id: true } })).map((item) => item.id);
  const fieldTemplateIds = (await prisma.fieldProgressTemplate.findMany({ where: { projectId }, select: { id: true } })).map((item) => item.id);
  const fieldItemIds = (await prisma.fieldProgressItem.findMany({ where: { projectId }, select: { id: true } })).map((item) => item.id);
  const fieldEntryIds = (await prisma.fieldProgressEntry.findMany({ where: { projectId }, select: { id: true } })).map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.siteReportAttachment.deleteMany({ where: { reportId: { in: reportIds } } });
    await tx.siteReportPhoto.deleteMany({ where: { reportId: { in: reportIds } } });
    await tx.siteReportLine.deleteMany({ where: { siteReportId: { in: reportIds } } });
    await tx.siteReport.deleteMany({ where: { projectId } });

    await tx.document.deleteMany({ where: { projectId } });
    await tx.documentFolder.deleteMany({ where: { projectId } });

    await tx.materialRequestItem.deleteMany({ where: { materialRequestId: { in: materialRequestIds } } });
    await tx.materialRequest.deleteMany({ where: { projectId } });

    await tx.fieldMaterialRequestItem.deleteMany({ where: { requestId: { in: fieldMaterialRequestIds } } });
    await tx.fieldMaterialRequest.deleteMany({ where: { projectId } });

    await tx.fieldProgressEntry.deleteMany({ where: { projectId } });
    await tx.fieldProgressItem.deleteMany({ where: { projectId } });
    await tx.fieldProgressTemplate.deleteMany({ where: { projectId } });

    await tx.projectMember.deleteMany({ where: { projectId } });

    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { projectId },
          { entityId: projectId },
          { entityId: { in: reportIds } },
          { entityId: { in: documentIds } },
          { entityId: { in: materialRequestIds } },
          { entityId: { in: fieldTemplateIds } },
          { entityId: { in: fieldItemIds } },
          { entityId: { in: fieldEntryIds } },
        ],
      },
    });

    await tx.project.delete({ where: { id: projectId } });

    if (plan.qaUsersToDelete.length > 0) {
      await tx.auditLog.deleteMany({
        where: {
          userId: { in: plan.qaUsersToDelete.map((user) => user.id) },
          projectId: null,
        },
      });
      await tx.user.deleteMany({
        where: { id: { in: plan.qaUsersToDelete.map((user) => user.id) }, email: { in: QA_EMAILS } },
      });
    }
  });

  for (const dir of Array.from(new Set(plan.storageDirs))) {
    if (!dir.includes(QA_STORAGE_SEGMENT)) {
      throw new Error(`Refusing to delete unsafe storage directory: ${dir}`);
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function verifyRollback() {
  const project = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  const qaUsers = await prisma.user.count({ where: { email: { in: QA_EMAILS } } });
  const storageExists = (await pathExists(qaStorageAbsolute)) || (await pathExists(localStorageQaAbsolute));
  console.log("=== REALISTIC TU HIEP ROLLBACK VERIFY ===");
  console.log(JSON.stringify({
    projectExists: !!project,
    remainingQaUsers: qaUsers,
    qaStorageExists: storageExists,
  }, null, 2));
  if (project) throw new Error("Rollback verification failed: project still exists");
  if (storageExists) throw new Error("Rollback verification failed: QA storage directory still exists");
}

async function main() {
  const plan = await buildRollbackPlan();
  await printPlan(plan);

  if (isDryRun) return;

  console.log("Executing rollback for QA realistic Tu Hiep data only...");
  await executeRollback(plan);
  await verifyRollback();
  console.log("Rollback completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
