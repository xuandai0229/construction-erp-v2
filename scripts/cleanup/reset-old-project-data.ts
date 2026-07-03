import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const connectionString = requireEnv("DATABASE_URL");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const storageRoot = path.resolve(process.env.STORAGE_ROOT || path.join(process.cwd(), "storage"));

const businessAuditEntityTypes = [
  "Project",
  "ProjectMember",
  "Document",
  "DocumentFolder",
  "SiteReport",
  "FieldProgress",
  "FieldProgressTemplate",
  "FieldProgressItem",
  "FieldProgressEntry",
  "Material",
  "MaterialItem",
  "MaterialRequest",
  "Contract",
  "Payment",
  "PaymentRequest",
  "ApprovalRequest",
  "Supplier",
  "WBSItem",
];

const models = [
  "user",
  "project",
  "projectMember",
  "wBSItem",
  "supplier",
  "contract",
  "documentFolder",
  "document",
  "siteReport",
  "siteReportPhoto",
  "siteReportAttachment",
  "siteReportLine",
  "materialRequest",
  "materialRequestItem",
  "materialItem",
  "materialMovement",
  "projectMaterialStock",
  "paymentPlan",
  "paymentRecord",
  "paymentRequest",
  "approvalRequest",
  "chatMessage",
  "auditLog",
  "fieldProgressTemplate",
  "fieldProgressItem",
  "fieldProgressEntry",
  "fieldMaterialRequest",
  "fieldMaterialRequestItem",
  "systemSetting",
] as const;

type ModelName = (typeof models)[number];
type Counts = Record<ModelName, number>;

async function getCounts(): Promise<Counts> {
  const entries = await Promise.all(
    models.map(async (model) => [model, await (prisma as any)[model].count()] as const),
  );
  return Object.fromEntries(entries) as Counts;
}

function printCounts(title: string, counts: Counts) {
  console.log(`\n=== ${title} ===`);
  for (const model of models) {
    console.log(`${model.padEnd(28)} ${counts[model]}`);
  }
}

function normalizeStoragePath(storagePath: string): string {
  return storagePath.replace(/\\/g, "/");
}

function resolveStoragePath(storagePath: string): string | null {
  if (!storagePath || storagePath.includes("\0") || normalizeStoragePath(storagePath).includes("../")) {
    return null;
  }

  const rawResolved = path.isAbsolute(storagePath)
    ? path.resolve(storagePath)
    : path.resolve(storageRoot, storagePath);

  const normalizedRoot = `${storageRoot}${path.sep}`;
  if (rawResolved !== storageRoot && !rawResolved.startsWith(normalizedRoot)) {
    return null;
  }
  return rawResolved;
}

function deletePhysicalFiles(storagePaths: string[]) {
  const uniquePaths = Array.from(new Set(storagePaths.filter(Boolean)));
  let deleted = 0;
  let skipped = 0;

  for (const storagePath of uniquePaths) {
    const resolvedPath = resolveStoragePath(storagePath);
    if (!resolvedPath) {
      skipped += 1;
      console.log(`[SKIP_FILE] Unsafe or out-of-storage path: ${storagePath}`);
      continue;
    }
    if (!fs.existsSync(resolvedPath)) continue;
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      skipped += 1;
      console.log(`[SKIP_FILE] Not a regular file: ${resolvedPath}`);
      continue;
    }
    fs.unlinkSync(resolvedPath);
    deleted += 1;
  }

  console.log(`\nPhysical storage cleanup: deleted=${deleted}, skipped=${skipped}, candidates=${uniquePaths.length}`);
}

async function main() {
  console.log("=== RESET OLD PROJECT BUSINESS DATA ===");
  console.log(`Storage root: ${storageRoot}`);

  const beforeCounts = await getCounts();
  printCounts("BEFORE COUNTS", beforeCounts);

  const projects = await prisma.project.findMany({
    select: { id: true, code: true, name: true, deletedAt: true },
    orderBy: { createdAt: "asc" },
  });
  const projectIds = projects.map((project) => project.id);

  console.log("\nProjects scheduled for deletion:");
  if (projects.length === 0) {
    console.log("- none");
  } else {
    for (const project of projects) {
      console.log(`- ${project.code} | ${project.name} | id=${project.id} | deletedAt=${project.deletedAt?.toISOString() || "null"}`);
    }
  }

  const documentPaths = await prisma.document.findMany({
    where: projectIds.length ? { projectId: { in: projectIds } } : undefined,
    select: { storagePath: true },
  });
  const reportAttachmentPaths = await prisma.siteReportAttachment.findMany({
    where: projectIds.length ? { report: { projectId: { in: projectIds } } } : undefined,
    select: { storagePath: true },
  });

  const deleted: Record<string, number> = {};
  const remember = (model: string, count: number) => {
    deleted[model] = count;
    console.log(`[DELETE] ${model.padEnd(28)} ${count}`);
  };

  await prisma.$transaction(
    async (tx) => {
      const audit = await tx.auditLog.deleteMany({
        where: {
          OR: [
            projectIds.length ? { projectId: { in: projectIds } } : { id: "__never__" },
            projectIds.length ? { entityId: { in: projectIds } } : { id: "__never__" },
            { entityType: { in: businessAuditEntityTypes } },
          ],
        },
      });
      remember("auditLog.business", audit.count);

      remember("fieldMaterialRequestItem", (await tx.fieldMaterialRequestItem.deleteMany({})).count);
      remember("fieldMaterialRequest", (await tx.fieldMaterialRequest.deleteMany({})).count);
      remember("materialRequestItem", (await tx.materialRequestItem.deleteMany({})).count);
      remember("materialRequest", (await tx.materialRequest.deleteMany({})).count);

      remember("siteReportAttachment", (await tx.siteReportAttachment.deleteMany({})).count);
      remember("siteReportPhoto", (await tx.siteReportPhoto.deleteMany({})).count);
      remember("siteReportLine", (await tx.siteReportLine.deleteMany({})).count);
      remember("siteReport", (await tx.siteReport.deleteMany({})).count);

      remember("paymentRecord", (await tx.paymentRecord.deleteMany({})).count);
      remember("paymentPlan", (await tx.paymentPlan.deleteMany({})).count);
      remember("paymentRequest", (await tx.paymentRequest.deleteMany({})).count);
      remember("approvalRequest", (await tx.approvalRequest.deleteMany({})).count);
      remember("contract", (await tx.contract.deleteMany({})).count);

      remember("materialMovement", (await tx.materialMovement.deleteMany({})).count);
      remember("projectMaterialStock", (await tx.projectMaterialStock.deleteMany({})).count);
      remember("materialItem", (await tx.materialItem.deleteMany({})).count);

      remember("fieldProgressEntry", (await tx.fieldProgressEntry.deleteMany({})).count);
      remember("fieldProgressItem", (await tx.fieldProgressItem.deleteMany({})).count);
      remember("fieldProgressTemplate", (await tx.fieldProgressTemplate.deleteMany({})).count);

      remember("document", (await tx.document.deleteMany({})).count);
      remember("documentFolder", (await tx.documentFolder.deleteMany({})).count);

      remember("wBSItem.children", (await tx.wBSItem.deleteMany({ where: { parentId: { not: null } } })).count);
      remember("wBSItem.roots", (await tx.wBSItem.deleteMany({})).count);
      remember("projectMember", (await tx.projectMember.deleteMany({})).count);
      remember("project", (await tx.project.deleteMany({})).count);
      remember("supplier", (await tx.supplier.deleteMany({})).count);
      remember("chatMessage", (await tx.chatMessage.deleteMany({})).count);
    },
    { timeout: 120_000 },
  );

  deletePhysicalFiles([
    ...documentPaths.map((item) => item.storagePath),
    ...reportAttachmentPaths.map((item) => item.storagePath),
  ]);

  const afterCounts = await getCounts();
  printCounts("AFTER COUNTS", afterCounts);

  console.log("\n=== DELETE COUNTS ===");
  console.log(JSON.stringify(deleted, null, 2));
  console.log("\nKept data:");
  console.log("- User accounts: kept to preserve login/admin/core access.");
  console.log("- SystemSetting: kept because it is system configuration, not old project business data.");
  console.log("- Non-business audit logs, if any: kept unless project/business scoped.");
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
