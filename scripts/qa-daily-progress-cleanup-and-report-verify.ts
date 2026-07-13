import "dotenv/config";

import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { evaluateVolumeGuard } from "../src/lib/field-progress/volume-guard";

const PROJECT_CODE = "CT-TAYHO-2026-001";
const QA_TAG = "QA_DAILY_REPORT_FULL_CLEAN_SUBMIT_PRINT_VERIFY_2026_07_04";
const DOC_DIR = path.join(process.cwd(), "docs", "qa");
const PRE_SNAPSHOT_PATH = path.join(DOC_DIR, "DAILY_PROGRESS_CLEANUP_PRE_SNAPSHOT_2026_07_04.md");
const CLEANUP_RESULT_PATH = path.join(DOC_DIR, "DAILY_PROGRESS_CLEANUP_RESULT_2026_07_04.md");
const REMAINING_AUDIT_PATH = path.join(DOC_DIR, "FIELD_PROGRESS_REMAINING_QUANTITY_AUDIT_AFTER_CLEANUP_2026_07_04.md");
const FULL_REPORT_PATH = path.join(DOC_DIR, "DAILY_PROGRESS_CLEANUP_FULL_DAILY_REPORT_SUBMIT_PRINT_VERIFY_2026_07_04.md");

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Snapshot = Awaited<ReturnType<typeof collectSnapshot>>;

function isApplyCleanup() {
  return process.env.APPLY_CLEANUP === "1" || process.env.DRY_RUN === "0";
}

function mdEscape(value: unknown) {
  return String(value ?? "")
    .replace(/\r?\n/g, "<br>")
    .replace(/\|/g, "\\|");
}

function n(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function fmt(value: unknown) {
  const num = n(value);
  if (!Number.isFinite(num)) return "NaN";
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(4)));
}

function hasQaTag(report: {
  title: string | null;
  summary: string | null;
  materials: string | null;
  labor: string | null;
  quality: string | null;
  issues: string | null;
  recommendations: string | null;
  generalNote: string | null;
  lines?: { note: string | null; issueNote: string | null; proposalNote: string | null }[];
}) {
  const haystack = [
    report.title,
    report.summary,
    report.materials,
    report.labor,
    report.quality,
    report.issues,
    report.recommendations,
    report.generalNote,
    ...(report.lines || []).flatMap((line) => [line.note, line.issueNote, line.proposalNote]),
  ].join("\n");
  return haystack.includes(QA_TAG);
}

async function getProjectOrThrow() {
  const project = await prisma.project.findUnique({
    where: { code: PROJECT_CODE },
    include: {
      fieldProgressTemplates: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project || project.deletedAt) {
    throw new Error(`Project ${PROJECT_CODE} was not found or is deleted.`);
  }
  return project;
}

async function collectSnapshot() {
  const project = await getProjectOrThrow();
  const template = project.fieldProgressTemplates[0] || null;
  const items = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      entries: {
        where: { deletedAt: null },
        select: { id: true, quantity: true, status: true, entryDate: true, note: true },
      },
    },
  });
  const workItems = items.filter((item) => item.itemType === "WORK");
  const entries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { item: true },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });
  const reports = await prisma.siteReport.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: {
      lines: {
        where: { deletedAt: null },
        select: { id: true, fieldProgressItemId: true, quantityToday: true, note: true, issueNote: true, proposalNote: true },
      },
      attachments: true,
    },
    orderBy: [{ reportDate: "asc" }, { createdAt: "asc" }],
  });

  const entryStatusCounts = new Map<string, number>();
  const entriesByDate = new Map<string, number>();
  for (const entry of entries) {
    entryStatusCounts.set(entry.status, (entryStatusCounts.get(entry.status) || 0) + 1);
    const date = entry.entryDate.toISOString().slice(0, 10);
    entriesByDate.set(date, (entriesByDate.get(date) || 0) + 1);
  }

  const approvedByItem = new Map<string, number>();
  const submittedByItem = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === "APPROVED") {
      approvedByItem.set(entry.itemId, (approvedByItem.get(entry.itemId) || 0) + n(entry.quantity));
    }
    if (entry.status === "SUBMITTED" || entry.status === "REVISION_REQUESTED" || entry.status === "DRAFT") {
      submittedByItem.set(entry.itemId, (submittedByItem.get(entry.itemId) || 0) + n(entry.quantity));
    }
  }

  const itemAudit = workItems.map((item) => {
    const designQuantity = n(item.designQuantity);
    const approvedQuantity = approvedByItem.get(item.id) || 0;
    const submittedQuantity = submittedByItem.get(item.id) || 0;
    const remainingQuantity = designQuantity - approvedQuantity - submittedQuantity;
    const percent = designQuantity > 0 ? ((approvedQuantity + submittedQuantity) / designQuantity) * 100 : 0;
    const guard = evaluateVolumeGuard({
      designQuantity,
      cumulativeBefore: approvedQuantity,
      todayQuantity: submittedQuantity,
      status: "SUBMITTED",
    });
    return {
      id: item.id,
      code: item.code,
      categoryName: item.categoryName,
      workContent: item.workContent,
      unit: item.unit,
      designQuantity,
      approvedQuantity,
      submittedQuantity,
      remainingQuantity,
      percent,
      status: item.status,
      guardLevel: guard.level,
      negative: remainingQuantity < 0,
      overDesign: approvedQuantity + submittedQuantity > designQuantity,
      invalidDesign: !Number.isFinite(designQuantity) || designQuantity <= 0,
      invalidUnit: !item.unit,
    };
  });

  const duplicateActiveEntries = await prisma.fieldProgressEntry.groupBy({
    by: ["projectId", "itemId", "entryDate"],
    where: {
      projectId: project.id,
      deletedAt: null,
      status: { not: "CANCELLED" },
    },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  const sourceEntries = entries.filter((entry) => entry.note?.includes("[SOURCE:SITE_REPORT:"));
  const qaReports = reports.filter(hasQaTag);
  const suspiciousItems = [...itemAudit]
    .filter((item) => item.negative || item.overDesign || item.invalidDesign || item.invalidUnit || item.percent > 100)
    .sort((a, b) => Math.abs(b.remainingQuantity) - Math.abs(a.remainingQuantity))
    .slice(0, 20);

  return {
    project,
    template,
    itemCounts: {
      total: items.length,
      work: workItems.length,
      group: items.filter((item) => item.itemType === "GROUP").length,
      note: items.filter((item) => item.itemType === "NOTE").length,
    },
    entries,
    entryStatusCounts,
    entriesByDate,
    reports,
    qaReports,
    sourceEntries,
    itemAudit,
    suspiciousItems,
    duplicateActiveEntries,
  };
}

function renderModelAnalysis() {
  const rows = [
    ["Project", "Công trình cha, scope cleanup theo code", "Không", "Giữ nguyên dữ liệu thật", "Chỉ lookup project code"],
    ["FieldProgressTemplate", "Template bảng khối lượng của project", "Không", "Là cấu trúc baseline", "Chỉ đọc template active"],
    ["FieldProgressItem", "Bảng khối lượng gốc/baseline: WORK/GROUP/NOTE, designQuantity", "Không", "User cấm xóa baseline", "Chỉ audit design/remaining"],
    ["FieldProgressEntry", "Dữ liệu khối lượng nhập theo ngày", "Có, trong scope project test", "Có deletedAt; cleanup để reset entered/approved/submitted", "Soft-delete active entries của project"],
    ["SiteReport", "Header báo cáo ngày/tuần", "Chỉ QA-tag", "Không xóa report thật không tag", "Soft-delete/cancel report có tag QA cũ"],
    ["SiteReportLine", "Dòng khối lượng của report", "Theo report QA-tag", "Cascade theo report nếu hard-delete nhưng ở đây dùng soft-delete report", "Không xóa report không tag; line cũ chỉ ghi nhận"],
    ["SiteReportPhoto", "Ảnh legacy theo report", "Không trực tiếp", "Không cần chạm dữ liệu thật", "Chỉ ghi nhận"],
    ["SiteReportAttachment", "Ảnh/file upload report", "Không trực tiếp", "Không xóa file/report thật", "Chỉ ghi nhận; upload dummy nếu UI cho phép"],
    ["AuditLog", "Lịch sử tạo/gửi/xóa report", "Không", "Phục vụ truy vết", "Không cleanup"],
  ];
  return [
    "## Phân tích model và quan hệ",
    "",
    "| Model/Bảng | Vai trò | Có được xóa không | Lý do | Cách xử lý an toàn |",
    "|---|---|---|---|---|",
    ...rows.map((row) => `| ${row.map(mdEscape).join(" | ")} |`),
    "",
    "### Trả lời nhanh",
    "",
    "1. Bảng khối lượng gốc: `FieldProgressItem` (`itemType=WORK` là công việc nhập khối lượng, `GROUP` là nhóm).",
    "2. Dữ liệu khối lượng nhập theo ngày: `FieldProgressEntry`.",
    "3. Khi gửi/duyệt báo cáo ngày, `SiteReportLine` được sync sang `FieldProgressEntry` qua marker `[SOURCE:SITE_REPORT:<reportId>]`; báo cáo tuần không sync.",
    "4. Khối lượng đã duyệt đang tính từ `FieldProgressEntry.status = APPROVED` và `deletedAt = null`.",
    "5. Khối lượng còn lại trong picker đang tính `designQuantity - approved(APPROVED trước ngày) - sameDay(DRAFT/SUBMITTED/APPROVED/REVISION_REQUESTED trong ngày)`; audit sau cleanup tính theo active entries.",
    "6. Xóa/soft-delete `FieldProgressEntry` không tự làm report cũ sync lại; chỉ sync lại nếu gọi submit/approve/reject/cancel transition trên report cũ.",
    "7. Report cũ có thể gây sai nếu entry nguồn của nó còn active; snapshot liệt kê report và marker để xử lý.",
    "8. Marker nguồn cần tìm trong `FieldProgressEntry.note` dạng `[SOURCE:SITE_REPORT:...]`.",
    "9. Duplicate hợp lệ phải theo `fieldProgressItemId` trong cùng report/ngày, không theo `quantityToday`.",
    "10. Prisma schema hiện không có unique constraint trên `projectId + date + itemId`; chỉ có index riêng lẻ.",
    "",
  ].join("\n");
}

function renderSnapshot(snapshot: Snapshot, title: string) {
  const statusNames = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REVISION_REQUESTED", "CANCELLED"];
  return [
    `# ${title}`,
    "",
    `- Thời điểm: ${new Date().toISOString()}`,
    `- Project: ${snapshot.project.id} / ${snapshot.project.code} / ${snapshot.project.name}`,
    `- Template active đầu tiên: ${snapshot.template?.id || "Không có"}`,
    `- FieldProgressItem: total=${snapshot.itemCounts.total}, WORK=${snapshot.itemCounts.work}, GROUP=${snapshot.itemCounts.group}, NOTE=${snapshot.itemCounts.note}`,
    `- Active FieldProgressEntry: ${snapshot.entries.length}`,
    `- SiteReport active liên quan: ${snapshot.reports.length}`,
    `- SiteReport QA-tag active: ${snapshot.qaReports.length}`,
    `- Entry có marker [SOURCE:SITE_REPORT:...]: ${snapshot.sourceEntries.length}`,
    `- Duplicate active entry cùng project/date/item: ${snapshot.duplicateActiveEntries.length}`,
    "",
    renderModelAnalysis(),
    "## FieldProgressEntry theo status",
    "",
    "| Status | Count |",
    "|---|---:|",
    ...statusNames.map((status) => `| ${status} | ${snapshot.entryStatusCounts.get(status) || 0} |`),
    "",
    "## FieldProgressEntry theo ngày",
    "",
    "| Ngày | Count |",
    "|---|---:|",
    ...[...snapshot.entriesByDate.entries()].sort().map(([date, count]) => `| ${date} | ${count} |`),
    "",
    "## Tổng approved/submitted theo item",
    "",
    "| Code | Hạng mục | Công việc | ĐVT | Design | Approved | Submitted/Pending | Remaining | Percent | Status |",
    "|---|---|---|---|---:|---:|---:|---:|---:|---|",
    ...snapshot.itemAudit.map((item) =>
      `| ${mdEscape(item.code)} | ${mdEscape(item.categoryName)} | ${mdEscape(item.workContent)} | ${mdEscape(item.unit)} | ${fmt(item.designQuantity)} | ${fmt(item.approvedQuantity)} | ${fmt(item.submittedQuantity)} | ${fmt(item.remainingQuantity)} | ${fmt(item.percent)}% | ${mdEscape(item.status)} |`,
    ),
    "",
    "## Top 20 item bất thường",
    "",
    "| Code | Công việc | Design | Approved | Submitted/Pending | Remaining | Percent | Status | Lỗi |",
    "|---|---|---:|---:|---:|---:|---:|---|---|",
    ...(snapshot.suspiciousItems.length
      ? snapshot.suspiciousItems.map((item) =>
          `| ${mdEscape(item.code)} | ${mdEscape(item.workContent)} | ${fmt(item.designQuantity)} | ${fmt(item.approvedQuantity)} | ${fmt(item.submittedQuantity)} | ${fmt(item.remainingQuantity)} | ${fmt(item.percent)}% | ${mdEscape(item.status)} | ${[
            item.negative ? "remaining âm" : "",
            item.overDesign ? "vượt thiết kế" : "",
            item.invalidDesign ? "design invalid" : "",
            item.invalidUnit ? "thiếu đơn vị" : "",
          ].filter(Boolean).join(", ")} |`,
        )
      : ["| Không có |  | 0 | 0 | 0 | 0 | 0% |  | PASS |"]),
    "",
    "## Report có tag QA cũ",
    "",
    "| Report id | Mã | Type | Status | Date | Lines | Attachments |",
    "|---|---|---|---|---|---:|---:|",
    ...(snapshot.qaReports.length
      ? snapshot.qaReports.map((report) =>
          `| ${report.id} | ${mdEscape(report.reportNo)} | ${report.type} | ${report.status} | ${report.reportDate.toISOString()} | ${report.lines.length} | ${report.attachments.length} |`,
        )
      : ["| Không có |  |  |  |  | 0 | 0 |"]),
    "",
    "## Entry có marker nguồn báo cáo",
    "",
    "| Entry id | Item | Date | Status | Quantity | Marker/note |",
    "|---|---|---|---|---:|---|",
    ...(snapshot.sourceEntries.length
      ? snapshot.sourceEntries.map((entry) =>
          `| ${entry.id} | ${entry.itemId} | ${entry.entryDate.toISOString().slice(0, 10)} | ${entry.status} | ${fmt(entry.quantity)} | ${mdEscape(entry.note)} |`,
        )
      : ["| Không có |  |  |  | 0 |  |"]),
    "",
    "## Duplicate active entry cùng project/date/item",
    "",
    "| Project | Item | Entry date | Count |",
    "|---|---|---|---:|",
    ...(snapshot.duplicateActiveEntries.length
      ? snapshot.duplicateActiveEntries.map((row) =>
          `| ${row.projectId} | ${row.itemId} | ${row.entryDate.toISOString()} | ${row._count.id} |`,
        )
      : ["| Không có |  |  | 0 |"]),
    "",
  ].join("\n");
}

function renderRemainingAudit(snapshot: Snapshot) {
  return [
    "# Field Progress Remaining Quantity Audit After Cleanup 2026-07-04",
    "",
    `- Project: ${snapshot.project.code} / ${snapshot.project.name}`,
    `- Active entries sau cleanup: ${snapshot.entries.length}`,
    "",
    "| Code | Category | Work content | Unit | Design | Approved | Submitted/Pending | Same-day pending | Remaining | Status | Âm? | Vượt thiết kế? | Null/NaN? | Đơn vị lỗi? |",
    "|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|---|",
    ...snapshot.itemAudit.map((item) =>
      `| ${mdEscape(item.code)} | ${mdEscape(item.categoryName)} | ${mdEscape(item.workContent)} | ${mdEscape(item.unit)} | ${fmt(item.designQuantity)} | ${fmt(item.approvedQuantity)} | ${fmt(item.submittedQuantity)} | 0 | ${fmt(item.remainingQuantity)} | ${mdEscape(item.status)} | ${item.negative ? "FAIL" : "PASS"} | ${item.overDesign ? "FAIL" : "PASS"} | ${item.invalidDesign ? "FAIL" : "PASS"} | ${item.invalidUnit ? "FAIL" : "PASS"} |`,
    ),
    "",
    "## Kết luận audit",
    "",
    snapshot.entries.length === 0
      ? "- PASS: active `FieldProgressEntry` của project đã về 0; nếu logic tính từ entry thì approved/submitted về 0 và remaining = designQuantity."
      : "- CẦN XEM LẠI: vẫn còn active `FieldProgressEntry` trong project.",
    snapshot.itemAudit.some((item) => item.negative || item.overDesign || item.invalidDesign || item.invalidUnit)
      ? "- CẦN SỬA: còn item có remaining âm/vượt thiết kế/design invalid/thiếu đơn vị."
      : "- PASS: không thấy remaining âm, over-design, NaN/null design invalid hoặc đơn vị trống.",
    "",
  ].join("\n");
}

async function cleanup(pre: Snapshot) {
  const now = new Date();
  const qaReportIds = pre.qaReports.map((report) => report.id);
  return prisma.$transaction(async (tx) => {
    const entries = await tx.fieldProgressEntry.updateMany({
      where: {
        projectId: pre.project.id,
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        status: "CANCELLED",
        approvedAt: null,
        approvedById: null,
      },
    });

    const reports = qaReportIds.length
      ? await tx.siteReport.updateMany({
          where: { id: { in: qaReportIds }, projectId: pre.project.id, deletedAt: null },
          data: { deletedAt: now, status: "CANCELLED" },
        })
      : { count: 0 };

    const lines = qaReportIds.length
      ? await tx.siteReportLine.updateMany({
          where: { siteReportId: { in: qaReportIds }, projectId: pre.project.id, deletedAt: null },
          data: { deletedAt: now },
        })
      : { count: 0 };

    return {
      softDeletedEntries: entries.count,
      cancelledQaReports: reports.count,
      softDeletedQaLines: lines.count,
    };
  });
}

function renderCleanupResult(pre: Snapshot, post: Snapshot, cleanupResult: Awaited<ReturnType<typeof cleanup>> | null) {
  const metrics = [
    ["Active FieldProgressEntry", pre.entries.length, post.entries.length, post.entries.length === 0 ? "PASS" : "FAIL"],
    ["Entry có marker SOURCE", pre.sourceEntries.length, post.sourceEntries.length, post.sourceEntries.length === 0 ? "PASS" : "FAIL"],
    ["Duplicate active project/date/item", pre.duplicateActiveEntries.length, post.duplicateActiveEntries.length, post.duplicateActiveEntries.length === 0 ? "PASS" : "FAIL"],
    ["Item over-design/remaining âm", pre.suspiciousItems.length, post.suspiciousItems.length, post.suspiciousItems.length === 0 ? "PASS" : "CHECK"],
    ["SiteReport QA-tag active", pre.qaReports.length, post.qaReports.length, post.qaReports.length === 0 ? "PASS" : "CHECK"],
  ];
  return [
    "# Daily Progress Cleanup Result 2026-07-04",
    "",
    `- Project: ${pre.project.code} / ${pre.project.name}`,
    `- Mode: ${isApplyCleanup() ? "APPLY_CLEANUP" : "DRY_RUN"}`,
    `- Soft-deleted entries: ${cleanupResult?.softDeletedEntries ?? 0}`,
    `- Cancelled QA-tag reports: ${cleanupResult?.cancelledQaReports ?? 0}`,
    `- Soft-deleted QA-tag lines: ${cleanupResult?.softDeletedQaLines ?? 0}`,
    "- Không xóa `FieldProgressItem`, `FieldProgressTemplate`, `Project`, `User`, `Document`.",
    "",
    "| Chỉ số | Trước cleanup | Sau cleanup | Kết quả |",
    "|---|---:|---:|---|",
    ...metrics.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} |`),
    "",
    "## Ghi chú xử lý báo cáo cũ",
    "",
    "- Report có QA tag được soft-delete/cancel trong scope project test.",
    "- Report không có tag rõ không bị xóa; nếu trước đó có progress entry thì entry đã bị soft-delete nên không còn tham gia tính khối lượng.",
    "- Report cũ không tự sync lại sau cleanup trừ khi có thao tác submit/approve/reject/cancel lại trên chính report đó.",
    "",
  ].join("\n");
}

function renderFullReportSkeleton(pre: Snapshot, post: Snapshot | null) {
  const status = post && post.entries.length === 0 && post.suspiciousItems.length === 0 ? "PASS CÓ ĐIỀU KIỆN" : "FAIL";
  return [
    "# Daily Progress Cleanup Full Daily Report Submit Print Verify 2026-07-04",
    "",
    "## A. Kết luận",
    "",
    `- Kết luận hiện tại: ${status}`,
    "- Ghi chú: File này được script khởi tạo sau cleanup/snapshot; phần UI submit/print/weekly sẽ được cập nhật sau khi test browser thật.",
    "",
    "## B. Snapshot trước cleanup",
    "",
    `- Active entry: ${pre.entries.length}`,
    `- Approved: ${pre.entryStatusCounts.get("APPROVED") || 0}`,
    `- Submitted: ${pre.entryStatusCounts.get("SUBMITTED") || 0}`,
    `- Item bất thường: ${pre.suspiciousItems.length}`,
    "",
    "## C. Kết quả cleanup",
    "",
    post
      ? `- Active entry sau cleanup: ${post.entries.length}`
      : "- Chưa apply cleanup.",
    post
      ? `- Item bất thường sau cleanup: ${post.suspiciousItems.length}`
      : "- Chưa có audit sau cleanup.",
    "",
    "## D. Dữ liệu báo cáo ngày đã nhập",
    "",
    "- Chưa cập nhật, sẽ ghi sau UI test.",
    "",
    "## E. Kết quả gửi báo cáo",
    "",
    "- Chưa cập nhật, sẽ ghi sau UI test.",
    "",
    "## F. Đối chiếu bản in",
    "",
    "| Field | Dữ liệu nhập | Bản in | Kết quả |",
    "|---|---|---|---|",
    "| Chưa test |  |  | PENDING |",
    "",
    "## G. Duplicate 44",
    "",
    "- Chưa cập nhật, sẽ ghi sau UI/script/browser test.",
    "",
    "## H. Báo cáo tuần",
    "",
    "- Chưa cập nhật, sẽ ghi sau UI test.",
    "",
    "## I. File đã sửa",
    "",
    "- `scripts/qa-daily-progress-cleanup-and-report-verify.ts`",
    "",
    "## J. Kết quả lệnh",
    "",
    "- PENDING",
    "",
    "## K. Checklist test tay",
    "",
    "- [x] Cleanup daily entries: script prepared/snapshot",
    "- [ ] Kiểm tra remaining",
    "- [ ] Tạo báo cáo ngày",
    "- [ ] Nhập quantity 44",
    "- [ ] Gửi báo cáo",
    "- [ ] Mở bản in",
    "- [ ] Đối chiếu dữ liệu",
    "- [ ] Tạo báo cáo tuần",
    "- [ ] Gửi báo cáo tuần",
    "- [ ] Mở bản in tuần",
    "",
  ].join("\n");
}

async function main() {
  fs.mkdirSync(DOC_DIR, { recursive: true });
  const pre = await collectSnapshot();
  fs.writeFileSync(PRE_SNAPSHOT_PATH, renderSnapshot(pre, "Daily Progress Cleanup Pre Snapshot 2026-07-04"), "utf8");

  let post: Snapshot | null = null;
  let cleanupResult: Awaited<ReturnType<typeof cleanup>> | null = null;

  if (isApplyCleanup()) {
    cleanupResult = await cleanup(pre);
    post = await collectSnapshot();
    fs.writeFileSync(CLEANUP_RESULT_PATH, renderCleanupResult(pre, post, cleanupResult), "utf8");
    fs.writeFileSync(REMAINING_AUDIT_PATH, renderRemainingAudit(post), "utf8");
  } else {
    fs.writeFileSync(CLEANUP_RESULT_PATH, renderCleanupResult(pre, pre, null), "utf8");
  }

  fs.writeFileSync(FULL_REPORT_PATH, renderFullReportSkeleton(pre, post), "utf8");

  console.log(JSON.stringify({
    mode: isApplyCleanup() ? "APPLY_CLEANUP" : "DRY_RUN",
    project: { id: pre.project.id, code: pre.project.code, name: pre.project.name },
    templateId: pre.template?.id || null,
    before: {
      activeEntries: pre.entries.length,
      qaReports: pre.qaReports.length,
      sourceEntries: pre.sourceEntries.length,
      suspiciousItems: pre.suspiciousItems.length,
      duplicateActiveEntries: pre.duplicateActiveEntries.length,
    },
    cleanup: cleanupResult,
    after: post
      ? {
          activeEntries: post.entries.length,
          qaReports: post.qaReports.length,
          sourceEntries: post.sourceEntries.length,
          suspiciousItems: post.suspiciousItems.length,
          duplicateActiveEntries: post.duplicateActiveEntries.length,
        }
      : null,
    files: {
      preSnapshot: PRE_SNAPSHOT_PATH,
      cleanupResult: CLEANUP_RESULT_PATH,
      remainingAudit: post ? REMAINING_AUDIT_PATH : null,
      fullReport: FULL_REPORT_PATH,
    },
  }, null, 2));
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
