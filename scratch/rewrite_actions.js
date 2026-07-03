const fs = require('fs');

let code = fs.readFileSync('src/app/(dashboard)/reports/actions.ts', 'utf8');

const OLD_PREVIEW_REGEX = /export async function getWeeklyReportPreview[\s\S]*?export async function createWeeklyReportFromApprovedDailyReports/m;
const NEW_SUMMARY_CODE = `export async function getWeeklyReportSummary(projectId: string, start: Date, end: Date, options?: { includeSubmitted?: boolean, includeDraft?: boolean }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as import('@prisma/client').UserRole };
  const hasProjectAccess = await canAccessProject(user, projectId);
  if (!hasProjectAccess) throw new Error("Unauthorized");

  const fromDate = start.toISOString().split("T")[0];
  const toDate = end.toISOString().split("T")[0];

  const statuses = ["APPROVED"];
  if (options?.includeSubmitted) statuses.push("SUBMITTED", "REVISION_REQUESTED");
  if (options?.includeDraft) statuses.push("DRAFT");

  const reports = await prisma.siteReport.findMany({
    where: {
      projectId,
      type: "DAILY",
      deletedAt: null,
      status: { in: statuses as any[] },
      reportDate: { gte: start, lte: end }
    },
    include: {
      lines: true,
      attachments: { select: { id: true, kind: true } }
    },
    orderBy: { reportDate: "asc" }
  });

  const dayStatuses: any[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    const dStr = curr.toISOString().split("T")[0];
    const dayReps = reports.filter(r => (r.reportDate as Date).toISOString().split("T")[0] === dStr);
    dayStatuses.push({
      date: dStr,
      hasReport: dayReps.length > 0,
      approvedCount: dayReps.filter(r => r.status === "APPROVED").length,
      submittedCount: dayReps.filter(r => r.status === "SUBMITTED" || r.status === "REVISION_REQUESTED").length,
      draftCount: dayReps.filter(r => r.status === "DRAFT").length,
      rejectedCount: dayReps.filter(r => r.status === "REJECTED").length,
      hasIssues: dayReps.some(r => r.issues && r.issues.trim() !== "Không có")
    });
    curr.setDate(curr.getDate() + 1);
  }

  const approvedReports = reports.filter(r => r.status === "APPROVED");
  
  let emptyReason = null;
  if (approvedReports.length === 0 && reports.length === 0) {
    emptyReason = "NO_REPORTS_IN_RANGE";
  } else if (approvedReports.length === 0 && reports.length > 0) {
    emptyReason = "NO_APPROVED_REPORTS";
  }

  const stats = {
    approvedReports: approvedReports.length,
    submittedReports: reports.filter(r => r.status === "SUBMITTED" || r.status === "REVISION_REQUESTED").length,
    rejectedReports: reports.filter(r => r.status === "REJECTED").length,
    emptyDays: dayStatuses.filter(d => !d.hasReport).length,
    workLineCount: 0,
    attachmentCount: reports.reduce((acc, r) => acc + r.attachments.length, 0)
  };

  const groupMap = new Map<string, { categoryId: string, categoryName: string, itemsMap: Map<string, any> }>();

  for (const rep of approvedReports) {
    const repDate = (rep.reportDate as Date).toISOString().split("T")[0];
    for (const line of rep.lines) {
      stats.workLineCount++;
      // Determine category (using wbsItemId or area or default)
      const categoryId = line.area || "default";
      const categoryName = line.area || "Chưa phân hạng mục";

      if (!groupMap.has(categoryId)) {
        groupMap.set(categoryId, { categoryId, categoryName, itemsMap: new Map() });
      }
      
      const group = groupMap.get(categoryId)!;
      const workKey = line.fieldProgressItemId || \`\${line.workName || line.workContent}_\${line.unit || ''}\`;
      
      if (!group.itemsMap.has(workKey)) {
        group.itemsMap.set(workKey, {
          workItemId: line.fieldProgressItemId,
          workContent: line.workName || line.workContent,
          unit: line.unit,
          quantity: 0,
          dates: new Set<string>(),
          sourceReports: [],
          sourceStatus: rep.status,
          hasIssue: false,
          issueNote: "",
          attachmentCount: 0
        });
      }

      const item = group.itemsMap.get(workKey)!;
      item.quantity += Number(line.quantityToday || 0);
      item.dates.add(repDate);
      if (!item.sourceReports.find((sr: any) => sr.id === rep.id)) {
        item.sourceReports.push({ id: rep.id, reportNo: rep.reportNo, date: repDate });
      }
      if (line.issueNote) {
        item.hasIssue = true;
        item.issueNote = (item.issueNote ? item.issueNote + " | " : "") + line.issueNote;
      }
      // approximation for line attachments
      item.attachmentCount += rep.attachments.length; // simplify for now
    }
  }

  const groups = Array.from(groupMap.values()).map(g => ({
    categoryId: g.categoryId,
    categoryName: g.categoryName,
    items: Array.from(g.itemsMap.values()).map(item => ({
      ...item,
      dates: Array.from(item.dates),
      quantity: item.quantity
    }))
  }));

  if (approvedReports.length > 0 && stats.workLineCount === 0) {
    emptyReason = "HAS_REPORTS_BUT_NO_WORK_LINES";
  }

  return {
    range: { fromDate, toDate },
    dayStatuses,
    stats,
    groups,
    emptyReason
  };
}

export async function createWeeklyReportFromApprovedDailyReports`;

code = code.replace(OLD_PREVIEW_REGEX, NEW_SUMMARY_CODE);

// Replace getWeeklyReportPreview calls with getWeeklyReportSummary
code = code.replace(/getWeeklyReportPreview/g, 'getWeeklyReportSummary');

// Update createWeeklyReportFromApprovedDailyReports logic to handle generalNote serialization
const OLD_CREATE_WEEKLY_REGEX = /export async function createWeeklyReportFromApprovedDailyReports\([\s\S]*?status: input\.isDraft \? "DRAFT" : "SUBMITTED";/m;
const NEW_CREATE_WEEKLY_CODE = `import { serializeWeeklyGeneralNote, WeeklyGeneralNote } from "@/lib/reports/weekly-report-utils";

export async function createWeeklyReportFromApprovedDailyReports(input: {
  projectId: string;
  weekStartDate: string;
  weekEndDate: string;
  summary?: string;
  issues?: string;
  recommendations?: string;
  weatherCondition?: string;
  nextWeekStartDate?: string;
  nextWeekEndDate?: string;
  nextWeekPlans?: Record<string, unknown>[]; // Legacy, replaced by weeklyNote
  weeklyNote?: WeeklyGeneralNote;
  isDraft: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as import('@prisma/client').UserRole };
  const hasProjectAccess = await canAccessProject(user, input.projectId);
  if (!canCreateReport(user, hasProjectAccess)) {
    throw new Error("Không có quyền tạo báo cáo tuần.");
  }

  const start = vietnamStartOfDayUtc(input.weekStartDate);
  const end = vietnamEndOfDayUtc(input.weekEndDate);

  const summaryData = await getWeeklyReportSummary(input.projectId, start, end);
  
  if (summaryData.stats.approvedReports === 0 && !input.isDraft) {
    throw new Error("Không có báo cáo ngày nào được duyệt trong tuần này để tổng hợp.");
  }

  const status = input.isDraft ? "DRAFT" : "SUBMITTED";`;

code = code.replace(OLD_CREATE_WEEKLY_REGEX, NEW_CREATE_WEEKLY_CODE);

// Update generalNote stringification in createWeeklyReportFromApprovedDailyReports
code = code.replace(/generalNote:\s*JSON\.stringify\(\{\n\s*nextWeekStartDate: input\.nextWeekStartDate,\n\s*nextWeekEndDate: input\.nextWeekEndDate,\n\s*nextWeekPlans: input\.nextWeekPlans\n\s*\}\),/g, 
  "generalNote: input.weeklyNote ? serializeWeeklyGeneralNote(input.weeklyNote) : null,");

fs.writeFileSync('src/app/(dashboard)/reports/actions.ts', code);
