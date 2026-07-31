"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SafetyPlanService } from "@/lib/safety-reporting/plan-service";
import { SafetyAssessmentService } from "@/lib/safety-reporting/assessment-service";
import { getWeekRange, formatIsoDateOnly, normalizeNfc } from "@/lib/safety-reporting/date-utils";
import { SafetyReportPlanStatus, SafetySelfAssessmentStatus, SafetyReportShift, SafetyReportConstructionType } from "@prisma/client";

async function getActor() {
  const session = await getSession();
  if (!session) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  return { id: session.id, role: session.role, name: session.name };
}

function startOfMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Lấy danh sách công trình
 */
export async function getSafetyProjectsAction(query = "") {
  const normalized = query.trim();
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      ...(normalized
        ? {
            OR: [
              { name: { contains: normalized, mode: "insensitive" } },
              { code: { contains: normalized, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
    take: 50,
  });
  return projects;
}

/**
 * Lấy danh sách Kế hoạch kiểm tra (Mẫu 02) kèm Thẻ đếm trạng thái
 */
export async function getSafetyPlansListAction(params?: {
  status?: string;
  search?: string;
  projectId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}) {
  const actor = await getActor();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 15;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.status && params.status !== "ALL") {
    where.status = params.status as SafetyReportPlanStatus;
  }
  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { documentNumber: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { createdBy: { name: { contains: q, mode: "insensitive" } } },
      { entries: { some: { projectNameSnapshot: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (params?.projectId) {
    where.entries = { some: { projectId: params.projectId } };
  }

  let orderBy: any[] = [{ periodStart: "desc" }, { createdAt: "desc" }];
  if (params?.sort === "created_desc") {
    orderBy = [{ createdAt: "desc" }];
  } else if (params?.sort === "created_asc") {
    orderBy = [{ createdAt: "asc" }];
  } else if (params?.sort === "week_desc") {
    orderBy = [{ periodStart: "desc" }];
  } else if (params?.sort === "week_asc") {
    orderBy = [{ periodStart: "asc" }];
  } else {
    orderBy = [{ updatedAt: "desc" }];
  }

  const [items, totalCount, countsGroup] = await Promise.all([
    prisma.safetyReportPlan.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        entries: { select: { id: true, projectId: true, projectNameSnapshot: true } },
      },
    }),
    prisma.safetyReportPlan.count({ where }),
    prisma.safetyReportPlan.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {
    ALL: 0,
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    REVISION_REQUIRED: 0,
    CANCELLED: 0,
  };

  countsGroup.forEach((g) => {
    counts[g.status] = g._count._all;
    counts.ALL += g._count._all;
  });

  const formattedItems = items.map((item) => {
    const projectNames = Array.from(
      new Set(item.entries.map((e) => e.projectNameSnapshot).filter(Boolean))
    );

    return {
      id: item.id,
      documentNumber: item.documentNumber,
      title: item.title,
      status: item.status,
      periodStart: item.periodStart.toISOString(),
      periodEnd: item.periodEnd.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      createdById: item.createdById,
      createdBy: item.createdBy,
      revisionReason: item.revisionReason,
      projects: projectNames.map((name) => ({ name })),
      entriesCount: item.entries.length,
      version: item.version,
    };
  });

  return {
    items: formattedItems,
    totalCount,
    counts,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    currentUserId: actor.id,
    currentUserRole: actor.role,
  };
}

/**
 * Lấy danh sách Báo cáo tự đánh giá (Mẫu 01) kèm Thẻ đếm trạng thái
 */
export async function getSafetyAssessmentsListAction(params?: {
  status?: string;
  search?: string;
  projectId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}) {
  const actor = await getActor();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 15;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.status && params.status !== "ALL") {
    where.status = params.status as SafetySelfAssessmentStatus;
  }
  if (params?.search) {
    const q = params.search.trim();
    where.OR = [
      { documentNumber: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { createdBy: { name: { contains: q, mode: "insensitive" } } },
      { entries: { some: { projectNameSnapshot: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (params?.projectId) {
    where.entries = { some: { projectId: params.projectId } };
  }

  let orderBy: any[] = [{ periodStart: "desc" }, { createdAt: "desc" }];
  if (params?.sort === "created_desc") {
    orderBy = [{ createdAt: "desc" }];
  } else if (params?.sort === "created_asc") {
    orderBy = [{ createdAt: "asc" }];
  } else if (params?.sort === "week_desc") {
    orderBy = [{ periodStart: "desc" }];
  } else if (params?.sort === "week_asc") {
    orderBy = [{ periodStart: "asc" }];
  } else {
    orderBy = [{ updatedAt: "desc" }];
  }

  const [items, totalCount, countsGroup] = await Promise.all([
    prisma.safetySelfAssessmentReport.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        sourcePlan: { select: { id: true, documentNumber: true } },
        entries: { select: { id: true, projectId: true, projectNameSnapshot: true } },
      },
    }),
    prisma.safetySelfAssessmentReport.count({ where }),
    prisma.safetySelfAssessmentReport.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {
    ALL: 0,
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    REVISION_REQUIRED: 0,
    CANCELLED: 0,
  };

  countsGroup.forEach((g) => {
    counts[g.status] = g._count._all;
    counts.ALL += g._count._all;
  });

  const formattedItems = items.map((item) => {
    const projectNames = Array.from(
      new Set(item.entries.map((e) => e.projectNameSnapshot).filter(Boolean))
    );

    return {
      id: item.id,
      documentNumber: item.documentNumber,
      title: item.title,
      status: item.status,
      periodStart: item.periodStart.toISOString(),
      periodEnd: item.periodEnd.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      createdById: item.createdById,
      createdBy: item.createdBy,
      sourcePlan: item.sourcePlan,
      revisionReason: item.revisionReason,
      projects: projectNames.map((name) => ({ name })),
      entriesCount: item.entries.length,
      version: item.version,
    };
  });

  return {
    items: formattedItems,
    totalCount,
    counts,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    currentUserId: actor.id,
    currentUserRole: actor.role,
  };
}

/**
 * Kiểm tra trùng tuần cho Kế hoạch kiểm tra (Mẫu 02)
 */
export async function checkSafetyPlanDuplicateAction(anchorDate: string) {
  const actor = await getActor();
  const anchor = new Date(anchorDate);
  if (Number.isNaN(anchor.getTime())) return null;

  const weekStart = startOfMonday(anchor);

  const existing = await prisma.safetyReportPlan.findFirst({
    where: {
      periodStart: weekStart,
      createdById: actor.id,
      status: { not: SafetyReportPlanStatus.CANCELLED },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentNumber: true,
      status: true,
      version: true,
      periodStart: true,
      periodEnd: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!existing) return null;

  return {
    id: existing.id,
    reportNumber: existing.documentNumber,
    status: existing.status,
    version: existing.version,
    weekStart: existing.periodStart.toISOString(),
    weekEnd: existing.periodEnd.toISOString(),
    updatedAt: existing.updatedAt.toISOString(),
    createdByName: existing.createdBy.name,
  };
}

/**
 * Kiểm tra trùng tuần cho Báo cáo tự đánh giá (Mẫu 01)
 */
export async function checkSafetyAssessmentDuplicateAction(anchorDate: string) {
  const actor = await getActor();
  const anchor = new Date(anchorDate);
  if (Number.isNaN(anchor.getTime())) return null;

  const weekStart = startOfMonday(anchor);

  const existing = await prisma.safetySelfAssessmentReport.findFirst({
    where: {
      periodStart: weekStart,
      createdById: actor.id,
      status: { not: SafetySelfAssessmentStatus.CANCELLED },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentNumber: true,
      status: true,
      version: true,
      periodStart: true,
      periodEnd: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!existing) return null;

  return {
    id: existing.id,
    reportNumber: existing.documentNumber,
    status: existing.status,
    version: existing.version,
    weekStart: existing.periodStart.toISOString(),
    weekEnd: existing.periodEnd.toISOString(),
    updatedAt: existing.updatedAt.toISOString(),
    createdByName: existing.createdBy.name,
  };
}

/**
 * Tạo mới Kế hoạch kiểm tra (Mẫu 02)
 */
export async function createSafetyPlanAction(anchorDate: string) {
  const actor = await getActor();
  const { weekStart, weekEnd } = getWeekRange(anchorDate);

  // Lấy dự án đầu tiên làm mặc định cho entries
  const defaultProject = await prisma.project.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  if (!defaultProject) {
    throw new Error("Hệ thống chưa có công trình nào. Vui lòng tạo công trình trước.");
  }

  const title = `KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH - TUẦN (${weekStart.toLocaleDateString("vi-VN")} ĐẾN ${weekEnd.toLocaleDateString("vi-VN")})`;

  // Khi tạo kế hoạch mới, chưa mặc định tạo entry tự động để các checkbox Sáng/Chiều/Tối để trống (Unchecked)
  const entries: any[] = [];

  const plan = await SafetyPlanService.createPlan(actor.id, {
    title,
    createdDate: new Date(),
    periodStart: weekStart,
    periodEnd: weekEnd,
    entries,
  });

  revalidatePath("/reports/safety");
  return { id: plan.id, status: plan.status };
}

/**
 * Tạo mới Báo cáo tự đánh giá (Mẫu 01)
 */
export async function createSafetyAssessmentAction(anchorDate: string) {
  const actor = await getActor();
  const anchor = new Date(anchorDate);
  if (Number.isNaN(anchor.getTime())) {
    throw new Error("Ngày đã chọn không hợp lệ.");
  }

  const weekStart = startOfMonday(anchor);
  const weekEnd = addDays(weekStart, 6);

  const report = await SafetyAssessmentService.createReport(actor.id, {
    periodStart: weekStart,
    periodEnd: weekEnd,
    officialDocumentNumber: "",
    documentPlace: "Hà Nội",
    recipientText: "Ban Giám đốc Công ty; Phòng kỹ thuật",
    reporterName: "Phạm Xuân Quảng",
    reporterTitle: "Cán bộ An toàn",
    reporterDepartment: "Phòng kỹ thuật",
  });

  revalidatePath("/reports/safety");
  revalidatePath("/reports/safety/reports");
  revalidatePath("/reports/safety/self-assessments");
  return { id: report.id, status: report.status };
}

/**
 * Lưu nháp Kế hoạch kiểm tra (Mẫu 02)
 */
export async function saveSafetyPlanAction(
  id: string,
  input: {
    expectedLockVersion: number;
    officialDocumentNumber?: string;
    place?: string;
    recipientName?: string;
    recipientTitle?: string;
    title?: string;
    purpose?: string;
    note?: string;
    entries: Array<{
      id?: string;
      inspectionDate: string;
      shift: SafetyReportShift;
      projectId: string;
      constructionType?: SafetyReportConstructionType;
      inspectionContent: string;
      trainingContent?: string;
      collaborators?: string;
      location?: string;
      note?: string;
      sortOrder?: number;
    }>;
  }
) {
  const actor = await getActor();

  const existing = await prisma.safetyReportPlan.findUnique({
    where: { id },
  });

  if (!existing) throw new Error("Không tìm thấy Kế hoạch");
  if (existing.status === "CANCELLED") {
    throw new Error("Hồ sơ này đã bị xóa.");
  }

  const projectIds = Array.from(new Set(input.entries.map((e) => e.projectId)));
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const recipientsObj = {
    place: input.place ?? "Hà Nội",
    recipientName: input.recipientName ?? "Ban Giám đốc Công ty, Ban chỉ huy các công trình",
    recipientTitle: input.recipientTitle ?? "Phòng kỹ thuật, Các BCH công trường",
  };

  const updated = await prisma.$transaction(async (tx) => {
    await tx.safetyReportPlanEntry.deleteMany({ where: { planId: id } });

    const plan = await tx.safetyReportPlan.update({
      where: { id },
      data: {
        officialDocumentNumber: input.officialDocumentNumber !== undefined ? (input.officialDocumentNumber.trim() || null) : existing.officialDocumentNumber,
        recipients: recipientsObj,
        title: input.title || existing.title,
        purpose: input.purpose,
        note: input.note,
        version: { increment: 1 },
        entries: {
          create: input.entries.map((e, index) => ({
            inspectionDate: new Date(e.inspectionDate),
            shift: e.shift,
            projectId: e.projectId,
            projectNameSnapshot: projectMap.get(e.projectId) || "Công trình",
            constructionType: e.constructionType || SafetyReportConstructionType.BUILDING,
            inspectionContent: e.inspectionContent,
            trainingContent: e.trainingContent,
            collaborators: e.collaborators,
            location: e.location,
            note: e.note,
            sortOrder: e.sortOrder ?? index,
          })),
        },
      },
      include: {
        entries: {
          orderBy: [{ inspectionDate: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    return plan;
  });

  revalidatePath(`/reports/safety/plans/${id}`);
  revalidatePath("/reports/safety");
  return {
    lockVersion: updated.version,
    entries: updated.entries.map((e) => ({
      id: e.id,
      inspectionDate: e.inspectionDate.toISOString(),
      shift: e.shift,
      projectId: e.projectId,
      projectNameSnapshot: e.projectNameSnapshot,
      inspectionContent: e.inspectionContent,
      note: e.note,
      sortOrder: e.sortOrder,
    })),
  };
}

/**
 * Lưu nháp Báo cáo tự đánh giá (Mẫu 01)
 */
export async function saveSafetyAssessmentAction(
  id: string,
  input: {
    expectedLockVersion: number;
    officialDocumentNumber?: string;
    documentPlace?: string;
    documentDate?: string | Date;
    recipientText?: string;
    reporterName?: string;
    reporterTitle?: string;
    reporterDepartment?: string;
    title?: string;
    internalNote?: string;
    previousWeekRemediation?: string;
    reinspectionConfirmation?: string;
    managementRecommendation?: string;
    otherOpinion?: string;
    entries: Array<{
      id?: string;
      inspectionDate: string;
      shift: SafetyReportShift;
      projectId?: string | null;
      customProjectName?: string | null;
      inspectionContent: string;
      assessment?: string;
      recommendation?: string;
      implementationResult?: string;
      sortOrder?: number;
    }>;
  }
) {
  try {
    const actor = await getActor();

    const updated = await SafetyAssessmentService.saveReport(actor.id, id, {
      expectedLockVersion: input.expectedLockVersion,
      officialDocumentNumber: input.officialDocumentNumber,
      documentPlace: input.documentPlace,
      documentDate: input.documentDate ? new Date(input.documentDate) : undefined,
      recipientText: input.recipientText,
      reporterName: input.reporterName,
      reporterTitle: input.reporterTitle,
      reporterDepartment: input.reporterDepartment,
      title: input.title,
      internalNote: input.internalNote,
      previousWeekRemediation: input.previousWeekRemediation,
      reinspectionConfirmation: input.reinspectionConfirmation,
      managementRecommendation: input.managementRecommendation,
      otherOpinion: input.otherOpinion,
      entries: input.entries,
    });

    revalidatePath(`/reports/safety/self-assessments/${id}`);
    revalidatePath(`/reports/safety/reports/${id}`);
    revalidatePath("/reports/safety");

    return {
      ok: true as const,
      lockVersion: updated.version,
      updatedAt: updated.updatedAt.toISOString(),
      entries: updated.entries.map((e) => ({
        id: e.id,
        inspectionDate: e.inspectionDate.toISOString(),
        shift: e.shift,
        projectId: e.projectId,
        customProjectName: e.customProjectName,
        projectNameSnapshot: e.projectNameSnapshot,
        inspectionContent: e.inspectionContent,
        assessment: e.assessment,
        recommendation: e.recommendation,
        implementationResult: e.implementationResult,
        sortOrder: e.sortOrder,
      })),
    };
  } catch (error: any) {
    console.error("SAFETY_ASSESSMENT_SAVE_FAILED", {
      name: error.name,
      code: error.code,
      message: error.message,
      meta: error.meta,
      cause: error.cause,
      reportId: id,
      expectedVersion: input.expectedLockVersion,
    });

    if (
      error.name === "SafetyReportVersionConflictError" ||
      error.message?.includes("CONFLICT") ||
      error.message?.includes("phiên làm việc khác")
    ) {
      return {
        ok: false as const,
        code: "VERSION_CONFLICT" as const,
        currentVersion: error.currentVersion,
        message: "Dữ liệu trên máy đã cũ hơn dữ liệu đang lưu trên hệ thống. Vui lòng tải lại dữ liệu mới nhất.",
      };
    }
    return {
      ok: false as const,
      code: "SAVE_FAILED" as const,
      message: error.message || "Không thể lưu báo cáo. Vui lòng thử lại.",
    };
  }
}

/**
 * Nạp lịch từ Kế hoạch kiểm tra vào Báo cáo
 */
export async function importEntriesFromPlanAction(reportId: string, planId: string) {
  const actor = await getActor();
  const updated = await SafetyAssessmentService.importEntriesFromPlan(actor.id, reportId, planId);
  revalidatePath(`/reports/safety/self-assessments/${reportId}`);
  revalidatePath(`/reports/safety/reports/${reportId}`);
  return {
    lockVersion: updated.version,
    entries: updated.entries.map((e) => ({
      id: e.id,
      inspectionDate: e.inspectionDate.toISOString(),
      shift: e.shift,
      projectId: e.projectId,
      customProjectName: e.customProjectName,
      projectNameSnapshot: e.projectNameSnapshot,
      inspectionContent: e.inspectionContent,
      assessment: e.assessment,
      recommendation: e.recommendation,
      implementationResult: e.implementationResult,
      sortOrder: e.sortOrder,
    })),
  };
}

/**
 * Xóa Báo cáo tự đánh giá
 */
export async function deleteSafetyAssessmentAction(id: string) {
  const actor = await getActor();
  await SafetyAssessmentService.deleteReport(actor.id, id);
  revalidatePath("/reports/safety");
  revalidatePath("/reports/safety/reports");
  revalidatePath("/reports/safety/self-assessments");
  return { success: true };
}

/**
 * Chuyển trạng thái Kế hoạch kiểm tra (SUBMIT / APPROVE / REVISION_REQUIRED / CANCEL)
 */
export async function transitionSafetyPlanAction(
  id: string,
  action: "SUBMIT" | "APPROVE" | "REQUEST_REVISION" | "CANCEL",
  reason?: string
) {
  const actor = await getActor();

  if (action === "SUBMIT") {
    const updated = await SafetyPlanService.submitPlan(actor.id, id);
    revalidatePath("/reports/safety");
    return { status: updated.status, lockVersion: updated.version };
  } else if (action === "APPROVE" || action === "REQUEST_REVISION") {
    const approve = action === "APPROVE";
    const updated = await SafetyPlanService.decidePlan(actor.id, id, approve, reason);
    revalidatePath("/reports/safety");
    return { status: updated.status, lockVersion: updated.version };
  } else if (action === "CANCEL") {
    const res = await SafetyPlanService.deleteOrCancelPlan(actor.id, id, reason);
    revalidatePath("/reports/safety");
    return { status: "CANCELLED", deleted: res.deleted };
  }

  throw new Error("Hành động không hợp lệ.");
}

/**
 * Chuyển trạng thái Báo cáo tự đánh giá (SUBMIT / APPROVE / REVISION_REQUIRED / CANCEL)
 */
export async function transitionSafetyAssessmentAction(
  id: string,
  action: "SUBMIT" | "APPROVE" | "REQUEST_REVISION" | "CANCEL",
  reason?: string
) {
  const actor = await getActor();

  if (action === "SUBMIT") {
    const updated = await SafetyAssessmentService.submitReport(actor.id, id);
    revalidatePath("/reports/safety");
    return { status: updated.status, lockVersion: updated.version };
  } else if (action === "APPROVE" || action === "REQUEST_REVISION") {
    const approve = action === "APPROVE";
    const updated = await SafetyAssessmentService.decideReport(actor.id, id, approve, reason);
    revalidatePath("/reports/safety");
    return { status: updated.status, lockVersion: updated.version };
  } else if (action === "CANCEL") {
    const res = await SafetyAssessmentService.deleteOrCancelReport(actor.id, id, reason);
    revalidatePath("/reports/safety");
    return { status: "CANCELLED", deleted: res.deleted };
  }

  throw new Error("Hành động không hợp lệ.");
}

/**
 * Xóa bản nháp Kế hoạch
 */
export async function deleteSafetyPlanAction(id: string) {
  const actor = await getActor();
  await SafetyPlanService.deleteOrCancelPlan(actor.id, id);
  revalidatePath("/reports/safety");
  return { success: true };
}

export async function deleteSafetyPlanDraftAction(id: string) {
  return deleteSafetyPlanAction(id);
}

/**
 * Xóa bản nháp Báo cáo tự đánh giá
 */
export async function deleteSafetyAssessmentDraftAction(id: string) {
  const actor = await getActor();
  await SafetyAssessmentService.deleteOrCancelReport(actor.id, id);
  revalidatePath("/reports/safety");
  return { success: true };
}
