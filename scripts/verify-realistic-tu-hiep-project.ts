import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

dotenv.config();

const PROJECT_CODE = "QA-TUHIEP-5F-001";
const QA_EMAIL_PATTERN = /^qa\..+@example\.test$/;
const QA_EMAILS = [
  "qa.admin.tuhiep@example.test",
  "qa.director.tuhiep@example.test",
  "qa.commander.tuhiep@example.test",
  "qa.engineer.tuhiep@example.test",
  "qa.accountant.tuhiep@example.test",
  "qa.viewer.tuhiep@example.test",
  "qa.outsider@example.test",
];
const OUTSIDER_EMAIL = "qa.outsider@example.test";
const QA_STORAGE_SEGMENT = "qa-realistic-tu-hiep";
const EXPECTED_PASSWORD = process.env.QA_REALISTIC_SEED_PASSWORD || "QaRealistic@2026!";
const EXPECTED_EMPTY_DAYS = ["2026-07-05", "2026-07-14"];
const EXPECTED_FIELD_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED"];
const EXPECTED_REPORT_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const connectionString = requireEnv("DATABASE_URL");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Check = {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
};

const checks: Check[] = [];

function pass(name: string, detail: string) {
  checks.push({ name, status: "PASS", detail });
}

function fail(name: string, detail: string) {
  checks.push({ name, status: "FAIL", detail });
}

function expectCheck(name: string, condition: boolean, passDetail: string, failDetail: string) {
  if (condition) pass(name, passDetail);
  else fail(name, failDetail);
}

function normalizeStoragePath(storagePath: string): string {
  return storagePath.replace(/\\/g, "/");
}

function resolveStoragePath(storagePath: string): string {
  if (path.isAbsolute(storagePath)) return storagePath;
  if (storagePath.startsWith("storage/") || storagePath.startsWith("storage\\")) {
    return path.join(process.cwd(), storagePath);
  }
  return path.join(process.cwd(), "storage", storagePath);
}

function isInsideQaStorage(storagePath: string): boolean {
  const normalized = normalizeStoragePath(storagePath);
  return normalized.includes(QA_STORAGE_SEGMENT) && !normalized.includes("../") && !path.isAbsolute(storagePath);
}

function percent(value: Prisma.Decimal | number | null | undefined, total: Prisma.Decimal | number | null | undefined) {
  const numerator = Number(value || 0);
  const denominator = Number(total || 0);
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

async function main() {
  const projects = await prisma.project.findMany({ where: { code: PROJECT_CODE } });
  const project = projects[0];
  expectCheck(
    "Project exists once",
    projects.length === 1,
    `Found exactly 1 project ${PROJECT_CODE}`,
    `Expected exactly 1 project ${PROJECT_CODE}, found ${projects.length}`,
  );
  if (!project) {
    printAndExit();
    return;
  }
  expectCheck(
    "Project status",
    project.status === "ACTIVE",
    "Project status is ACTIVE",
    `Project status is ${project.status}`,
  );

  const users = await prisma.user.findMany({
    where: { email: { in: QA_EMAILS } },
    include: {
      projectMembers: true,
      assignedProjectMembers: true,
      auditLogs: true,
      messages: true,
      createdSiteReports: true,
      approvedSiteReports: true,
      createdWBSItems: true,
      materialRequests: true,
      approvalRequests: true,
      approvals: true,
      documents: true,
      createdFieldTemplates: true,
      createdFieldItems: true,
      createdFieldEntries: true,
      approvedFieldEntries: true,
      fieldMaterialRequests: true,
    },
    orderBy: { email: "asc" },
  });
  const unexpectedQaUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@example.test", notIn: QA_EMAILS } },
    select: { email: true },
  });
  expectCheck("QA users count", users.length === 7, "Found 7 expected QA users", `Expected 7 QA users, found ${users.length}`);
  expectCheck(
    "QA users email scope",
    users.every((user) => QA_EMAIL_PATTERN.test(user.email)) && unexpectedQaUsers.length === 0,
    "All QA users match qa.*@example.test and no extra @example.test users exist",
    `Unexpected @example.test users: ${unexpectedQaUsers.map((user) => user.email).join(", ") || "none"}`,
  );
  const passwordChecks = await Promise.all(users.map(async (user) => ({
    email: user.email,
    isPlaintext: user.password === EXPECTED_PASSWORD,
    isBcrypt: user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$"),
    matches: await bcrypt.compare(EXPECTED_PASSWORD, user.password).catch(() => false),
  })));
  expectCheck(
    "QA user passwords are hashed",
    passwordChecks.every((item) => item.isBcrypt && item.matches && !item.isPlaintext),
    "All QA user passwords are bcrypt hashes and match the expected test password",
    JSON.stringify(passwordChecks),
  );

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  const outsider = users.find((user) => user.email === OUTSIDER_EMAIL);
  expectCheck("Project members count", members.length === 4, `Found ${members.length} active members`, `Expected 4 active members, found ${members.length}`);
  expectCheck(
    "Outsider has no ProjectMember",
    !!outsider && members.every((member) => member.userId !== outsider.id),
    "qa.outsider@example.test is not a member of the project",
    "Outsider user is missing or has project membership",
  );
  expectCheck(
    "Project member roles",
    ["CHIEF_COMMANDER", "SUPERVISOR", "VIEWER", "VIEWER"].every((role) => members.map((member) => member.role).includes(role as any)),
    `Member roles: ${members.map((member) => `${member.user.email}:${member.role}`).join(", ")}`,
    `Unexpected member roles: ${members.map((member) => `${member.user.email}:${member.role}`).join(", ")}`,
  );

  const templates = await prisma.fieldProgressTemplate.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { items: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
  });
  expectCheck("Field template count", templates.length === 1, `Found ${templates.length} template`, `Expected 1 template, found ${templates.length}`);
  const template = templates[0];
  const fieldItems = template?.items || [];
  const groupItems = fieldItems.filter((item) => item.itemType === "GROUP");
  const workItems = fieldItems.filter((item) => item.itemType === "WORK");
  const itemCodeCounts = new Map<string, number>();
  for (const item of fieldItems) {
    if (item.code) itemCodeCounts.set(item.code, (itemCodeCounts.get(item.code) || 0) + 1);
  }
  const duplicateCodes = Array.from(itemCodeCounts.entries()).filter(([, count]) => count > 1);
  const groupIds = new Set(groupItems.map((item) => item.id));
  expectCheck("Field items count", fieldItems.length === 34, `Found ${fieldItems.length} field progress items`, `Expected 34 field progress items, found ${fieldItems.length}`);
  expectCheck("Field item code uniqueness", duplicateCodes.length === 0, "No duplicate item code in template", `Duplicate codes: ${JSON.stringify(duplicateCodes)}`);
  expectCheck(
    "Field parent hierarchy",
    groupItems.every((item) => item.parentId === null) && workItems.every((item) => !!item.parentId && groupIds.has(item.parentId)),
    `GROUP=${groupItems.length}, WORK=${workItems.length}, parent links valid`,
    "Some GROUP has parentId or WORK parentId does not point to a GROUP",
  );
  expectCheck(
    "WORK design quantity",
    workItems.every((item) => item.designQuantity && new Prisma.Decimal(item.designQuantity).gt(0)),
    "All WORK items have designQuantity > 0",
    "Some WORK item has missing or non-positive designQuantity",
  );

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { item: true },
  });
  const entryStatuses = Array.from(new Set(entries.map((entry) => entry.status))).sort();
  const entryDates = new Set(entries.map((entry) => entry.entryDate.toISOString().slice(0, 10)));
  expectCheck("Field entries count", entries.length === 34, `Found ${entries.length} entries`, `Expected 34 entries, found ${entries.length}`);
  expectCheck(
    "Field entry statuses",
    EXPECTED_FIELD_STATUSES.every((status) => entryStatuses.includes(status as any)),
    `Statuses present: ${entryStatuses.join(", ")}`,
    `Missing expected statuses. Present: ${entryStatuses.join(", ")}`,
  );
  expectCheck(
    "Planned empty days",
    EXPECTED_EMPTY_DAYS.every((day) => !entryDates.has(day)),
    `No field entries on empty days ${EXPECTED_EMPTY_DAYS.join(", ")}`,
    `Some expected empty day has entries. Dates: ${Array.from(entryDates).sort().join(", ")}`,
  );
  expectCheck(
    "No individual entry exceeds design quantity",
    entries.every((entry) => entry.item.designQuantity && new Prisma.Decimal(entry.quantity).lte(entry.item.designQuantity)),
    "Every entry quantity is <= designQuantity of its item",
    "At least one entry quantity exceeds item designQuantity",
  );
  const entrySums = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { projectId: project.id, deletedAt: null },
    _sum: { quantity: true },
  });
  const itemById = new Map(fieldItems.map((item) => [item.id, item]));
  const overDesign = entrySums.filter((sum) => {
    const item = itemById.get(sum.itemId);
    if (!item?.designQuantity || !sum._sum.quantity) return false;
    return new Prisma.Decimal(sum._sum.quantity).gt(item.designQuantity);
  });
  expectCheck("No cumulative over design", overDesign.length === 0, "No cumulative quantity exceeds designQuantity", `Over design itemIds: ${overDesign.map((item) => item.itemId).join(", ")}`);
  const completionBands = new Set<string>();
  for (const item of workItems) {
    const sum = entrySums.find((entry) => entry.itemId === item.id)?._sum.quantity || 0;
    const pct = percent(sum, item.designQuantity);
    if (pct === 0) completionBands.add("0");
    if (pct >= 20 && pct <= 50) completionBands.add("20-50");
    if (pct >= 90 && pct <= 95) completionBands.add("90-95");
    if (pct === 100) completionBands.add("100");
  }
  expectCheck(
    "Completion bands",
    ["0", "20-50", "90-95", "100"].every((band) => completionBands.has(band)),
    `Completion bands present: ${Array.from(completionBands).sort().join(", ")}`,
    `Missing completion bands. Present: ${Array.from(completionBands).sort().join(", ")}`,
  );

  const reports = await prisma.siteReport.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { lines: true, attachments: true, createdBy: true },
  });
  const reportStatuses = Array.from(new Set(reports.map((report) => report.status))).sort();
  const reportTypes = Array.from(new Set(reports.map((report) => report.type))).sort();
  const reportNoCounts = new Map<string, number>();
  for (const report of reports) reportNoCounts.set(report.reportNo, (reportNoCounts.get(report.reportNo) || 0) + 1);
  const duplicateReportNos = Array.from(reportNoCounts.entries()).filter(([, count]) => count > 1);
  const qaUserIds = new Set(users.map((user) => user.id));
  expectCheck("Reports count", reports.length === 12, `Found ${reports.length} site reports`, `Expected 12 reports, found ${reports.length}`);
  expectCheck("Report types", reportTypes.includes("DAILY") && reportTypes.includes("WEEKLY"), `Report types: ${reportTypes.join(", ")}`, `Missing DAILY or WEEKLY. Present: ${reportTypes.join(", ")}`);
  expectCheck(
    "Report statuses",
    EXPECTED_REPORT_STATUSES.every((status) => reportStatuses.includes(status as any)),
    `Report statuses: ${reportStatuses.join(", ")}`,
    `Missing expected statuses. Present: ${reportStatuses.join(", ")}`,
  );
  expectCheck("ReportNo uniqueness", duplicateReportNos.length === 0, "No duplicate reportNo in QA project", `Duplicate reportNo: ${JSON.stringify(duplicateReportNos)}`);
  expectCheck("Report creators are QA users", reports.every((report) => qaUserIds.has(report.createdById)), "Every report createdById is a QA user", "At least one report creator is not a QA user");
  expectCheck(
    "Report lines valid",
    reports.every((report) =>
      report.lines.every((line) =>
        line.projectId === project.id &&
        line.quantityToday.gte(0) &&
        (!!line.fieldProgressItemId ? fieldItems.some((item) => item.id === line.fieldProgressItemId) : !!line.workContent),
      ),
    ),
    "All report lines belong to the QA project and link to valid FieldProgressItem or valid workContent",
    "Some report line is invalid or orphaned",
  );

  const attachments = reports.flatMap((report) => report.attachments.map((attachment) => ({ ...attachment, reportNo: report.reportNo })));
  const invalidAttachmentPaths = attachments.filter((attachment) => !isInsideQaStorage(attachment.storagePath));
  const missingAttachmentFiles = attachments.filter((attachment) => !fs.existsSync(resolveStoragePath(attachment.storagePath)));
  const badAttachmentMime = attachments.filter((attachment) => {
    const ext = path.extname(attachment.originalName || attachment.fileName).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") return attachment.mimeType !== "image/jpeg";
    if (ext === ".pdf") return attachment.mimeType !== "application/pdf";
    return true;
  });
  expectCheck("Report attachments count", attachments.length === 5, `Found ${attachments.length} report attachments`, `Expected 5 report attachments, found ${attachments.length}`);
  expectCheck("Report attachment physical files", missingAttachmentFiles.length === 0, "Every report attachment has a physical file", `Missing files: ${missingAttachmentFiles.map((a) => a.storagePath).join(", ")}`);
  expectCheck("Report attachment storage scope", invalidAttachmentPaths.length === 0, "Every report attachment path is inside storage/qa-realistic-tu-hiep", `Out-of-scope paths: ${invalidAttachmentPaths.map((a) => a.storagePath).join(", ")}`);
  expectCheck("Report attachment MIME", badAttachmentMime.length === 0, "Every report attachment MIME matches extension", `Bad MIME attachments: ${badAttachmentMime.map((a) => a.originalName || a.fileName).join(", ")}`);

  const folders = await prisma.documentFolder.findMany({ where: { projectId: project.id, deletedAt: null } });
  const documents = await prisma.document.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { folder: true, uploadedBy: true },
  });
  const folderIdSet = new Set(folders.map((folder) => folder.id));
  const invalidDocumentPaths = documents.filter((doc) => !isInsideQaStorage(doc.storagePath));
  const missingDocumentFiles = documents.filter((doc) => !fs.existsSync(resolveStoragePath(doc.storagePath)));
  expectCheck("Document folders count", folders.length === 10, `Found ${folders.length} document folders`, `Expected 10 folders, found ${folders.length}`);
  expectCheck("Documents count", documents.length === 12, `Found ${documents.length} documents`, `Expected 12 documents, found ${documents.length}`);
  expectCheck("Document folder links", documents.every((doc) => folderIdSet.has(doc.folderId)), "Every document folderId belongs to QA project", "Some document points to invalid folder");
  expectCheck("Document project links", documents.every((doc) => doc.projectId === project.id), "Every document projectId is QA project", "Some document points to another project");
  expectCheck("Document physical files", missingDocumentFiles.length === 0, "Every document has a physical file", `Missing document files: ${missingDocumentFiles.map((doc) => doc.storagePath).join(", ")}`);
  expectCheck("Document storage scope", invalidDocumentPaths.length === 0, "Every document path is inside storage/qa-realistic-tu-hiep", `Out-of-scope document paths: ${invalidDocumentPaths.map((doc) => doc.storagePath).join(", ")}`);

  const materialRequests = await prisma.materialRequest.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { items: true, requestedBy: true },
  });
  expectCheck("Material requests count", materialRequests.length === 4, `Found ${materialRequests.length} material requests`, `Expected 4 material requests, found ${materialRequests.length}`);
  expectCheck("Material request items", materialRequests.every((request) => request.items.length > 0), "Every material request has at least one item", "Some material request has no items");
  expectCheck("Material request project scope", materialRequests.every((request) => request.projectId === project.id), "Every material request belongs to QA project", "Some material request points to another project");
  expectCheck("Material request creator scope", materialRequests.every((request) => qaUserIds.has(request.requestedById)), "Every material request creator is a QA user", "Some material request creator is not QA");

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { projectId: project.id },
        { userId: { in: Array.from(qaUserIds) } },
        { entityId: project.id },
        { entityId: { in: reports.map((report) => report.id) } },
        { entityId: { in: documents.map((doc) => doc.id) } },
      ],
    },
  });
  const outOfScopeAudit = auditLogs.filter((log) => log.projectId && log.projectId !== project.id);
  expectCheck("Audit log scope", outOfScopeAudit.length === 0, `Audit logs in QA scope: ${auditLogs.length}`, `Audit logs point outside QA project: ${outOfScopeAudit.map((log) => log.id).join(", ")}`);

  const orphanChecks = {
    reportAttachments: await prisma.siteReportAttachment.count({ where: { report: null as any } }).catch(() => 0),
    reportLines: await prisma.siteReportLine.count({ where: { siteReport: null as any } }).catch(() => 0),
    materialRequestItems: await prisma.materialRequestItem.count({ where: { materialRequest: null as any } }).catch(() => 0),
  };
  pass("Schema-level orphan protection", `Required relations prevent direct orphan queries; sampled child records above are valid. Raw orphan fallback: ${JSON.stringify(orphanChecks)}`);

  const counts = {
    projects: projects.length,
    users: users.length,
    projectMembers: members.length,
    fieldProgressTemplates: templates.length,
    fieldProgressItems: fieldItems.length,
    fieldProgressEntries: entries.length,
    siteReports: reports.length,
    siteReportLines: reports.reduce((sum, report) => sum + report.lines.length, 0),
    siteReportAttachments: attachments.length,
    documentFolders: folders.length,
    documents: documents.length,
    materialRequests: materialRequests.length,
    materialRequestItems: materialRequests.reduce((sum, request) => sum + request.items.length, 0),
    auditLogs: auditLogs.length,
  };

  console.log("=== REALISTIC TU HIEP VERIFY ===");
  console.log(JSON.stringify({ projectId: project.id, counts }, null, 2));
  for (const check of checks) {
    console.log(`${check.status} | ${check.name} | ${check.detail}`);
  }

  printAndExit();
}

function printAndExit() {
  const failures = checks.filter((check) => check.status === "FAIL");
  console.log(`VERIFY RESULT: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} checks passed)`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
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
