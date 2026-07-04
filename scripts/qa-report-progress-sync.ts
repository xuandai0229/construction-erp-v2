import "dotenv/config";

import { Prisma, PrismaClient, type FieldProgressItem, type SiteReportStatus, type User, type UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  getReportProgressSourceMarker,
  syncSiteReportProgressEntries,
} from "../src/lib/reports/report-progress-sync";

const QA_TAG = "QA_REPORT_PROGRESS_SYNC_2026_07_04";
const PROJECT_CODE = "CT-TAYHO-2026-001";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function dec(value: number | string) {
  return new Prisma.Decimal(value);
}

function qaId(key: string) {
  return `qa_rps_${key}`;
}

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function reportDate(value: string) {
  return new Date(`${value}T07:00:00.000Z`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function actorFrom(user: Pick<User, "id" | "name" | "role">) {
  return { id: user.id, name: user.name, role: user.role as UserRole };
}

async function findUserByRole(roles: UserRole[]) {
  const user = await prisma.user.findFirst({
    where: { deletedAt: null, isActive: true, role: { in: roles } },
    orderBy: { createdAt: "asc" },
  });
  assert(user, `Missing active user with role in ${roles.join(", ")}`);
  return user;
}

async function getFixture() {
  const project = await prisma.project.findFirst({
    where: { code: PROJECT_CODE, deletedAt: null },
  });
  assert(project, `Missing seeded project ${PROJECT_CODE}`);

  const template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: project.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  assert(template, "Missing FieldProgressTemplate for seeded project");

  const candidateItems = await prisma.fieldProgressItem.findMany({
    where: {
      projectId: project.id,
      templateId: template.id,
      itemType: "WORK",
      deletedAt: null,
      designQuantity: { not: null },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const approvedSums = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: {
      projectId: project.id,
      status: "APPROVED",
      deletedAt: null,
      itemId: { in: candidateItems.map((item) => item.id) },
    },
    _sum: { quantity: true },
  });
  const approvedByItem = new Map(approvedSums.map((sum) => [sum.itemId, Number(sum._sum.quantity || 0)]));
  const items = candidateItems
    .map((item) => ({
      item,
      remaining: Number(item.designQuantity || 0) - (approvedByItem.get(item.id) || 0),
    }))
    .filter((entry) => entry.remaining > 0)
    .slice(0, 4)
    .map((entry) => entry.item);
  assert(items.length >= 3, "Need at least 3 baseline work items with designQuantity for QA");

  const siteUser =
    (await prisma.user.findFirst({ where: { email: "tayho.site@seed.local", deletedAt: null, isActive: true } })) ||
    (await findUserByRole(["ENGINEER", "CHIEF_COMMANDER", "MANAGER"]));
  const director =
    (await prisma.user.findFirst({ where: { email: "tayho.director@seed.local", deletedAt: null, isActive: true } })) ||
    (await findUserByRole(["ADMIN", "DIRECTOR"]));
  const viewerOrAccountant =
    (await prisma.user.findFirst({ where: { role: "ACCOUNTANT", deletedAt: null, isActive: true } })) ||
    (await findUserByRole(["STAFF"]));

  return { project, template, items, siteUser, director, viewerOrAccountant };
}

function safeQuantity(item: FieldProgressItem) {
  const designQuantity = Number(item.designQuantity || 0);
  return Math.max(0.1, Math.min(1, designQuantity / 10));
}

async function resetQaRows(projectId: string) {
  const now = new Date();
  await prisma.fieldProgressEntry.updateMany({
    where: {
      projectId,
      note: { contains: QA_TAG },
    },
    data: {
      status: "CANCELLED",
      deletedAt: now,
    },
  });
  await prisma.siteReport.updateMany({
    where: {
      projectId,
      reportNo: { startsWith: QA_TAG },
    },
    data: {
      status: "CANCELLED",
      deletedAt: now,
    },
  });
}

async function upsertReport(input: {
  id: string;
  projectId: string;
  createdById: string;
  reporterName: string;
  status: SiteReportStatus;
  date: string;
}) {
  return prisma.siteReport.upsert({
    where: { id: input.id },
    update: {
      projectId: input.projectId,
      type: "DAILY",
      reportNo: `${QA_TAG}-${input.id}`,
      title: `${QA_TAG} ${input.id}`,
      reportDate: reportDate(input.date),
      weatherCondition: "SUNNY",
      status: input.status,
      createdById: input.createdById,
      reporterName: input.reporterName,
      submittedAt: input.status === "SUBMITTED" ? new Date() : null,
      approvedAt: null,
      approvedById: null,
      rejectedReason: null,
      deletedAt: null,
    },
    create: {
      id: input.id,
      projectId: input.projectId,
      type: "DAILY",
      reportNo: `${QA_TAG}-${input.id}`,
      title: `${QA_TAG} ${input.id}`,
      reportDate: reportDate(input.date),
      weatherCondition: "SUNNY",
      status: input.status,
      createdById: input.createdById,
      reporterName: input.reporterName,
      submittedAt: input.status === "SUBMITTED" ? new Date() : null,
    },
  });
}

async function upsertLine(input: {
  id: string;
  reportId: string;
  projectId: string;
  item: FieldProgressItem;
  quantity: number;
  sortOrder: number;
}) {
  const designQuantity = Number(input.item.designQuantity || 0);
  return prisma.siteReportLine.upsert({
    where: { id: input.id },
    update: {
      siteReportId: input.reportId,
      projectId: input.projectId,
      fieldProgressItemId: input.item.id,
      workName: input.item.workContent || input.item.code || input.item.id,
      workContent: input.item.workContent || input.item.code || input.item.id,
      area: input.item.categoryName,
      unit: input.item.unit,
      designQuantity: dec(designQuantity),
      quantityToday: dec(input.quantity),
      quantityBefore: dec(0),
      quantityCumulative: dec(input.quantity),
      progressPercent: dec(designQuantity > 0 ? (input.quantity / designQuantity) * 100 : 0),
      note: `${QA_TAG} line`,
      sortOrder: input.sortOrder,
      deletedAt: null,
    },
    create: {
      id: input.id,
      siteReportId: input.reportId,
      projectId: input.projectId,
      fieldProgressItemId: input.item.id,
      workName: input.item.workContent || input.item.code || input.item.id,
      workContent: input.item.workContent || input.item.code || input.item.id,
      area: input.item.categoryName,
      unit: input.item.unit,
      designQuantity: dec(designQuantity),
      quantityToday: dec(input.quantity),
      quantityBefore: dec(0),
      quantityCumulative: dec(input.quantity),
      progressPercent: dec(designQuantity > 0 ? (input.quantity / designQuantity) * 100 : 0),
      note: `${QA_TAG} line`,
      sortOrder: input.sortOrder,
    },
  });
}

async function activeEntries(projectId: string, itemId: string, date: string) {
  return prisma.fieldProgressEntry.findMany({
    where: {
      projectId,
      itemId,
      entryDate: utcDate(date),
      deletedAt: null,
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function expectBlocked(label: string, action: () => Promise<unknown>, contains: string) {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(contains)) {
      throw new Error(`${label} failed with unexpected message: ${message}`);
    }
    console.log(`PASS ${label}: blocked with "${message}"`);
    return;
  }
  throw new Error(`${label} should have been blocked`);
}

async function main() {
  console.log(`QA start: ${QA_TAG}`);
  const { project, items, siteUser, director, viewerOrAccountant } = await getFixture();
  await resetQaRows(project.id);

  const reportA = await upsertReport({
    id: qaId("report_a"),
    projectId: project.id,
    createdById: siteUser.id,
    reporterName: siteUser.name,
    status: "DRAFT",
    date: "2026-07-20",
  });
  await upsertLine({ id: qaId("line_a1"), reportId: reportA.id, projectId: project.id, item: items[0], quantity: safeQuantity(items[0]), sortOrder: 0 });
  await upsertLine({ id: qaId("line_a2"), reportId: reportA.id, projectId: project.id, item: items[1], quantity: safeQuantity(items[1]), sortOrder: 1 });

  let entries = await activeEntries(project.id, items[0].id, "2026-07-20");
  assertEqual(entries.length, 0, "DRAFT report must not create active FieldProgressEntry before sync");

  await prisma.siteReport.update({ where: { id: reportA.id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
  const submitResult = await syncSiteReportProgressEntries(prisma, {
    reportId: reportA.id,
    mode: "SUBMIT",
    actor: actorFrom(siteUser),
    qaTag: QA_TAG,
  });
  assertEqual(submitResult.created, 2, "Submit should create two daily progress entries");

  entries = await activeEntries(project.id, items[0].id, "2026-07-20");
  assertEqual(entries.length, 1, "Submit should create exactly one active entry per project/date/item");
  assertEqual(entries[0].status, "SUBMITTED", "Submitted report should create SUBMITTED entry");
  assert(entries[0].note?.includes(getReportProgressSourceMarker(reportA.id)), "Entry note should include report source marker");

  const resubmitResult = await syncSiteReportProgressEntries(prisma, {
    reportId: reportA.id,
    mode: "SUBMIT",
    actor: actorFrom(siteUser),
    qaTag: QA_TAG,
  });
  assertEqual(resubmitResult.created, 0, "Submitting same report again must not create duplicates");
  entries = await activeEntries(project.id, items[0].id, "2026-07-20");
  assertEqual(entries.length, 1, "Resubmit must keep one active entry");

  await prisma.siteReport.update({ where: { id: reportA.id }, data: { status: "APPROVED", approvedById: director.id, approvedAt: new Date() } });
  const approveResult = await syncSiteReportProgressEntries(prisma, {
    reportId: reportA.id,
    mode: "APPROVE",
    actor: actorFrom(director),
    qaTag: QA_TAG,
  });
  assertEqual(approveResult.updated, 2, "Approve should update two existing entries");
  entries = await activeEntries(project.id, items[0].id, "2026-07-20");
  assertEqual(entries[0].status, "APPROVED", "Approved report should approve synced entry");
  assertEqual(entries[0].approvedById, director.id, "Approved entry should track approver");

  const duplicateReport = await upsertReport({
    id: qaId("report_duplicate"),
    projectId: project.id,
    createdById: siteUser.id,
    reporterName: siteUser.name,
    status: "SUBMITTED",
    date: "2026-07-20",
  });
  await upsertLine({ id: qaId("line_duplicate"), reportId: duplicateReport.id, projectId: project.id, item: items[0], quantity: safeQuantity(items[0]), sortOrder: 0 });
  await expectBlocked(
    "duplicate report same day/item",
    () => syncSiteReportProgressEntries(prisma, {
      reportId: duplicateReport.id,
      mode: "SUBMIT",
      actor: actorFrom(siteUser),
      qaTag: QA_TAG,
    }),
    "đã có khối lượng",
  );

  const overItem = items[2];
  const overReport = await upsertReport({
    id: qaId("report_over"),
    projectId: project.id,
    createdById: siteUser.id,
    reporterName: siteUser.name,
    status: "SUBMITTED",
    date: "2026-07-21",
  });
  await upsertLine({
    id: qaId("line_over"),
    reportId: overReport.id,
    projectId: project.id,
    item: overItem,
    quantity: Number(overItem.designQuantity || 0) + 1,
    sortOrder: 0,
  });
  await expectBlocked(
    "over design quantity",
    () => syncSiteReportProgressEntries(prisma, {
      reportId: overReport.id,
      mode: "SUBMIT",
      actor: actorFrom(siteUser),
      qaTag: QA_TAG,
    }),
    "Vượt khối lượng thiết kế",
  );

  const rejectReport = await upsertReport({
    id: qaId("report_reject"),
    projectId: project.id,
    createdById: siteUser.id,
    reporterName: siteUser.name,
    status: "SUBMITTED",
    date: "2026-07-22",
  });
  await upsertLine({ id: qaId("line_reject"), reportId: rejectReport.id, projectId: project.id, item: items[1], quantity: safeQuantity(items[1]), sortOrder: 0 });
  await syncSiteReportProgressEntries(prisma, {
    reportId: rejectReport.id,
    mode: "SUBMIT",
    actor: actorFrom(siteUser),
    qaTag: QA_TAG,
  });
  await prisma.siteReport.update({ where: { id: rejectReport.id }, data: { status: "REJECTED", rejectedReason: `${QA_TAG} reject` } });
  await syncSiteReportProgressEntries(prisma, {
    reportId: rejectReport.id,
    mode: "REJECT",
    actor: actorFrom(director),
    qaTag: QA_TAG,
  });
  entries = await activeEntries(project.id, items[1].id, "2026-07-22");
  assertEqual(entries.length, 1, "Rejected report should keep traceable non-approved entry");
  assertEqual(entries[0].status, "REVISION_REQUESTED", "Rejected report entry should not remain submitted/approved");

  await expectBlocked(
    "accountant/viewer cannot sync report progress",
    () => syncSiteReportProgressEntries(prisma, {
      reportId: rejectReport.id,
      mode: "SUBMIT",
      actor: actorFrom(viewerOrAccountant),
      qaTag: QA_TAG,
    }),
    "Không có quyền",
  );

  const approvedSum = await prisma.fieldProgressEntry.aggregate({
    where: {
      projectId: project.id,
      itemId: items[0].id,
      status: "APPROVED",
      deletedAt: null,
      note: { contains: QA_TAG },
    },
    _sum: { quantity: true },
  });
  assertEqual(Number(approvedSum._sum.quantity || 0), safeQuantity(items[0]), "Summary source should read approved FieldProgressEntry quantity");

  const orphanCount = await prisma.fieldProgressEntry.count({
    where: {
      projectId: project.id,
      note: { contains: QA_TAG },
      item: { deletedAt: { not: null } },
    },
  });
  assertEqual(orphanCount, 0, "QA sync entries must not point to deleted baseline items");

  console.log("QA PASS: report progress sync behavior is consistent");
}

main()
  .catch((error) => {
    console.error("QA FAIL:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
