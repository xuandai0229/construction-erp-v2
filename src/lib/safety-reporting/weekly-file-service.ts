import prisma from "@/lib/prisma";
import { getWeekRange, formatIsoDateOnly } from "./date-utils";
import { SafetyPlanService } from "./plan-service";
import { SafetyAssessmentService } from "./assessment-service";

export interface SafetyWeeklyFileSummary {
  id: string; // Primary SafetyWeeklyFile.id
  planId: string | null;
  reportId: string | null;
  fileCode: string;
  documentNumber: string;
  officialDocumentNumber: string | null;
  periodStart: string;
  periodEnd: string;
  weekNumber: number;
  year: number;
  createdById: string;
  createdBy: { id: string; name: string; role?: string };
  updatedAt: string;
  planStatus: "NOT_CREATED" | "DRAFT" | "SAVED";
  assessmentStatus: "NOT_CREATED" | "DRAFT" | "SAVED";
  planEntriesCount: number;
  assessmentEntriesCount: number;
  projects: Array<{ name: string }>;
  canDelete: boolean;
}

export interface SafetyWeeklyFileDetail {
  weeklyFileId: string;
  planId: string | null;
  reportId: string | null;
  periodStart: Date;
  periodEnd: Date;
  createdById: string;
  createdBy: { id: string; name: string; role?: string };
  planData: any | null;
  assessmentData: any | null;
}

export type DeleteSafetyWeeklyFileResult =
  | { ok: true; weeklyFileId: string }
  | {
      ok: false;
      code: "NOT_FOUND" | "FORBIDDEN" | "ALREADY_DELETED" | "CONFLICT" | "DELETE_FAILED";
      message: string;
    };

function getWeekNumber(d: Date) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  return { week, year: d.getFullYear() };
}

function formatWeeklyFileCode(
  officialDocumentNumber?: string | null,
  sequenceNumber?: number | null,
  weekNumber?: number,
  year?: number
): string {
  if (officialDocumentNumber && officialDocumentNumber.trim()) {
    return officialDocumentNumber.trim();
  }
  if (sequenceNumber && year) {
    return `HS-ATLĐ-${year}-${String(sequenceNumber).padStart(4, "0")}`;
  }
  if (weekNumber && year) {
    return `HS-ATLĐ-${year}-W${String(weekNumber).padStart(2, "0")}`;
  }
  return "HS-ATLĐ-TUẦN";
}

/**
 * Selector phán quyết quyền xóa Hồ sơ ATLĐ theo tuần
 */
export function canDeleteWeeklyFile({
  actor,
  weeklyFile,
}: {
  actor?: { id: string; role: string } | null;
  weeklyFile: { createdById: string };
}): boolean {
  if (!actor || !actor.id) return false;
  if (actor.role === "ADMIN" || actor.role === "DIRECTOR" || actor.role === "DEPUTY_DIRECTOR") {
    return true;
  }
  if (weeklyFile.createdById === actor.id) {
    return true;
  }
  return false;
}

export class SafetyWeeklyFileService {
  /**
   * Lấy danh sách Hồ sơ ATLĐ theo tuần từ bảng cha SafetyWeeklyFile (deletedAt: null)
   */
  static async getWeeklyFilesList(
    actor?: { id: string; role: string } | null,
    params?: {
      search?: string;
      year?: number;
      sort?: "updated_desc" | "updated_asc" | "week_desc" | "week_asc";
      completionStatus?: "ALL" | "COMPLETE" | "NO_PLAN" | "NO_REPORT";
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    items: SafetyWeeklyFileSummary[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 15;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (params?.year) {
      const yearStart = new Date(params.year, 0, 1);
      const yearEnd = new Date(params.year, 11, 31, 23, 59, 59);
      where.periodStart = { gte: yearStart, lte: yearEnd };
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { fileCode: { contains: q, mode: "insensitive" } },
        { officialDocumentNumber: { contains: q, mode: "insensitive" } },
        { createdBy: { name: { contains: q, mode: "insensitive" } } },
        {
          plans: {
            some: {
              deletedAt: null,
              entries: { some: { projectNameSnapshot: { contains: q, mode: "insensitive" } } },
            },
          },
        },
        {
          assessments: {
            some: {
              deletedAt: null,
              entries: { some: { projectNameSnapshot: { contains: q, mode: "insensitive" } } },
            },
          },
        },
      ];
    }

    const weeklyFiles = await prisma.safetyWeeklyFile.findMany({
      where,
      orderBy: [{ periodStart: "desc" }, { updatedAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        plans: {
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          include: {
            entries: { select: { id: true, projectId: true, projectNameSnapshot: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        assessments: {
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          include: {
            entries: { select: { id: true, projectId: true, projectNameSnapshot: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    let items: SafetyWeeklyFileSummary[] = weeklyFiles.map((wf) => {
      const plan = wf.plans[0] || null;
      const report = wf.assessments[0] || null;

      const projectNames = Array.from(
        new Set(
          [
            ...(plan?.entries.map((e) => e.projectNameSnapshot) || []),
            ...(report?.entries.map((e) => e.projectNameSnapshot) || []),
          ].filter(Boolean)
        )
      );

      const weekInfo = getWeekNumber(wf.periodStart);
      const code = formatWeeklyFileCode(
        wf.officialDocumentNumber || plan?.officialDocumentNumber || report?.officialDocumentNumber,
        plan?.sequenceNumber || report?.sequenceNumber,
        weekInfo.week,
        weekInfo.year
      );

      const userCanDelete = canDeleteWeeklyFile({ actor, weeklyFile: wf });

      return {
        id: wf.id,
        planId: plan?.id || null,
        reportId: report?.id || null,
        fileCode: code,
        documentNumber: plan?.documentNumber || report?.documentNumber || `(Nháp v1)`,
        officialDocumentNumber: wf.officialDocumentNumber || plan?.officialDocumentNumber || report?.officialDocumentNumber || null,
        periodStart: wf.periodStart.toISOString(),
        periodEnd: wf.periodEnd.toISOString(),
        weekNumber: weekInfo.week,
        year: weekInfo.year,
        createdById: wf.createdById,
        createdBy: wf.createdBy,
        updatedAt: wf.updatedAt.toISOString(),
        planStatus: plan ? (plan.entries.length > 0 ? "SAVED" : "DRAFT") : "NOT_CREATED",
        assessmentStatus: report ? (report.entries.length > 0 ? "SAVED" : "DRAFT") : "NOT_CREATED",
        planEntriesCount: plan?.entries.length || 0,
        assessmentEntriesCount: report?.entries.length || 0,
        projects: projectNames.map((name) => ({ name })),
        canDelete: userCanDelete,
      };
    });

    // Apply completionStatus filter
    if (params?.completionStatus && params.completionStatus !== "ALL") {
      if (params.completionStatus === "COMPLETE") {
        items = items.filter((i) => i.planEntriesCount > 0 && i.assessmentEntriesCount > 0);
      } else if (params.completionStatus === "NO_PLAN") {
        items = items.filter((i) => i.planStatus === "NOT_CREATED" || i.planEntriesCount === 0);
      } else if (params.completionStatus === "NO_REPORT") {
        items = items.filter((i) => i.assessmentStatus === "NOT_CREATED" || i.assessmentEntriesCount === 0);
      }
    }

    // Apply sort
    const sort = params?.sort || "updated_desc";
    items.sort((a, b) => {
      if (sort === "updated_asc") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sort === "week_desc") {
        return new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime();
      }
      if (sort === "week_asc") {
        return new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime();
      }
      // default: updated_desc
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const paginatedItems = items.slice(skip, skip + pageSize);

    return {
      items: paginatedItems,
      totalCount: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    };
  }

  /**
   * Tải chi tiết một Hồ sơ ATLĐ theo tuần
   */
  static async getWeeklyFileDetail(weeklyFileId: string): Promise<SafetyWeeklyFileDetail | null> {
    // Attempt 1: Look up by SafetyWeeklyFile.id directly
    let wf = await prisma.safetyWeeklyFile.findFirst({
      where: { id: weeklyFileId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        plans: {
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            entries: { orderBy: [{ inspectionDate: "asc" }, { sortOrder: "asc" }] },
          },
          orderBy: { createdAt: "desc" },
        },
        assessments: {
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            entries: { orderBy: [{ inspectionDate: "asc" }, { sortOrder: "asc" }] },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Attempt 2: If passed planId or reportId, resolve parent SafetyWeeklyFile
    if (!wf) {
      const plan = await prisma.safetyReportPlan.findFirst({
        where: { id: weeklyFileId, deletedAt: null, status: { not: "CANCELLED" } },
        select: { weeklyFileId: true },
      });
      if (plan?.weeklyFileId) {
        wf = await prisma.safetyWeeklyFile.findFirst({
          where: { id: plan.weeklyFileId, deletedAt: null },
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            plans: {
              where: { deletedAt: null, status: { not: "CANCELLED" } },
              include: {
                createdBy: { select: { id: true, name: true, role: true } },
                entries: { orderBy: [{ inspectionDate: "asc" }, { sortOrder: "asc" }] },
              },
              orderBy: { createdAt: "desc" },
            },
            assessments: {
              where: { deletedAt: null, status: { not: "CANCELLED" } },
              include: {
                createdBy: { select: { id: true, name: true, role: true } },
                entries: { orderBy: [{ inspectionDate: "asc" }, { sortOrder: "asc" }] },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });
      }
    }

    if (!wf) {
      const rep = await prisma.safetySelfAssessmentReport.findFirst({
        where: { id: weeklyFileId, deletedAt: null, status: { not: "CANCELLED" } },
        select: { weeklyFileId: true },
      });
      if (rep?.weeklyFileId) {
        wf = await prisma.safetyWeeklyFile.findFirst({
          where: { id: rep.weeklyFileId, deletedAt: null },
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            plans: {
              where: { deletedAt: null, status: { not: "CANCELLED" } },
              include: {
                createdBy: { select: { id: true, name: true, role: true } },
                entries: { orderBy: [{ inspectionDate: "asc" }, { sortOrder: "asc" }] },
              },
              orderBy: { createdAt: "desc" },
            },
            assessments: {
              where: { deletedAt: null, status: { not: "CANCELLED" } },
              include: {
                createdBy: { select: { id: true, name: true, role: true } },
                entries: { orderBy: [{ inspectionDate: "asc" }, { sortOrder: "asc" }] },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });
      }
    }

    if (!wf) return null;

    const plan = wf.plans[0] || null;
    const assessment = wf.assessments[0] || null;

    return {
      weeklyFileId: wf.id,
      planId: plan?.id || null,
      reportId: assessment?.id || null,
      periodStart: wf.periodStart,
      periodEnd: wf.periodEnd,
      createdById: wf.createdById,
      createdBy: wf.createdBy,
      planData: plan,
      assessmentData: assessment,
    };
  }

  /**
   * Khởi tạo hoặc tìm Hồ sơ ATLĐ tuần cho một ngày neo (anchorDate) nguyên tử trong Transaction
   */
  static async getOrCreateWeeklyFile(userId: string, anchorDateStr: string) {
    if (!prisma.safetyWeeklyFile) {
      throw new Error("[SCHEMA_NOT_READY] Prisma Client chưa được generate cho SafetyWeeklyFile. Vui lòng kiểm tra lại tiến trình server.");
    }

    const { weekStart, weekEnd } = getWeekRange(anchorDateStr);

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Find existing active SafetyWeeklyFile
        let wf = await tx.safetyWeeklyFile.findFirst({
          where: {
            periodStart: weekStart,
            deletedAt: null,
          },
          include: {
            plans: { where: { deletedAt: null, status: { not: "CANCELLED" } } },
            assessments: { where: { deletedAt: null, status: { not: "CANCELLED" } } },
          },
          orderBy: { createdAt: "desc" },
        });

        let created = false;
        if (!wf) {
          const weekInfo = getWeekNumber(weekStart);
          const fileCode = `HS-ATLĐ-${weekInfo.year}-W${String(weekInfo.week).padStart(2, "0")}`;

          wf = await tx.safetyWeeklyFile.create({
            data: {
              fileCode,
              periodStart: weekStart,
              periodEnd: weekEnd,
              createdById: userId,
            },
            include: { plans: true, assessments: true },
          });
          created = true;
        }

        // 2. Ensure Plan exists inside transaction
        let plan: any = wf.plans?.find((p: any) => !p.deletedAt && p.status !== "CANCELLED");
        if (!plan) {
          const title = `KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH - TUẦN (${weekStart.toLocaleDateString("vi-VN")} ĐẾN ${weekEnd.toLocaleDateString("vi-VN")})`;

          plan = await SafetyPlanService.createPlan(
            userId,
            {
              title,
              createdDate: new Date(),
              periodStart: weekStart,
              periodEnd: weekEnd,
              entries: [],
            },
            tx
          );

          await tx.safetyReportPlan.update({
            where: { id: plan.id },
            data: { weeklyFileId: wf.id },
          });
        } else if (!plan.weeklyFileId) {
          await tx.safetyReportPlan.update({
            where: { id: plan.id },
            data: { weeklyFileId: wf.id },
          });
        }

        // 3. Ensure Assessment exists inside transaction
        let assessment: any = wf.assessments?.find((a: any) => !a.deletedAt && a.status !== "CANCELLED");
        if (!assessment) {
          assessment = await SafetyAssessmentService.createReport(
            userId,
            {
              periodStart: weekStart,
              periodEnd: weekEnd,
              sourcePlanId: plan.id,
              officialDocumentNumber: plan.officialDocumentNumber || "",
              documentPlace: "Hà Nội",
              recipientText: "Ban Giám đốc Công ty; Phòng kỹ thuật",
              reporterName: "Phạm Xuân Quảng",
              reporterTitle: "Cán bộ An toàn",
              reporterDepartment: "Phòng kỹ thuật",
            },
            tx
          );

          await tx.safetySelfAssessmentReport.update({
            where: { id: assessment.id },
            data: { weeklyFileId: wf.id },
          });
        } else if (!assessment.weeklyFileId) {
          await tx.safetySelfAssessmentReport.update({
            where: { id: assessment.id },
            data: { weeklyFileId: wf.id, sourcePlanId: plan.id },
          });
        }

        if (created) {
          await tx.safetyReportAuditLog.create({
            data: {
              reportType: "WEEKLY_FILE",
              reportId: wf.id,
              action: "CREATE",
              actorId: userId,
              correlationId: `wf_create_${wf.id}_${Date.now()}`,
              afterData: {
                fileCode: wf.fileCode,
                periodStart: weekStart,
                createdById: userId,
              },
            },
          });
        }

        return {
          weeklyFileId: wf.id,
          planId: plan.id,
          reportId: assessment.id,
          created,
        };
      });
    } catch (err: any) {
      // Race condition handling on unique constraint
      if (err?.code === "P2002" || err?.message?.includes("unique") || err?.message?.includes("SafetyWeeklyFile")) {
        const existingWf = await prisma.safetyWeeklyFile.findFirst({
          where: {
            periodStart: weekStart,
            deletedAt: null,
          },
          include: {
            plans: { where: { deletedAt: null, status: { not: "CANCELLED" } } },
            assessments: { where: { deletedAt: null, status: { not: "CANCELLED" } } },
          },
        });
        if (existingWf && existingWf.plans[0] && existingWf.assessments[0]) {
          return {
            weeklyFileId: existingWf.id,
            planId: existingWf.plans[0].id,
            reportId: existingWf.assessments[0].id,
            created: false,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Xóa Hồ sơ ATLĐ theo tuần (Transactional Soft Delete)
   */
  static async deleteWeeklyFile(
    actor: { id: string; role: string },
    weeklyFileId: string
  ): Promise<DeleteSafetyWeeklyFileResult> {
    if (!weeklyFileId) {
      return { ok: false, code: "NOT_FOUND", message: "Mã hồ sơ không hợp lệ." };
    }

    // 1. Fetch SafetyWeeklyFile
    let wf = await prisma.safetyWeeklyFile.findFirst({
      where: { id: weeklyFileId },
    });

    // Fallback: If passed planId or reportId, find parent SafetyWeeklyFile
    if (!wf) {
      const plan = await prisma.safetyReportPlan.findFirst({
        where: { id: weeklyFileId },
        select: { weeklyFileId: true },
      });
      if (plan?.weeklyFileId) {
        wf = await prisma.safetyWeeklyFile.findFirst({
          where: { id: plan.weeklyFileId },
        });
      }
    }

    if (!wf) {
      const rep = await prisma.safetySelfAssessmentReport.findFirst({
        where: { id: weeklyFileId },
        select: { weeklyFileId: true },
      });
      if (rep?.weeklyFileId) {
        wf = await prisma.safetyWeeklyFile.findFirst({
          where: { id: rep.weeklyFileId },
        });
      }
    }

    if (!wf) {
      return { ok: false, code: "NOT_FOUND", message: "Không tìm thấy hồ sơ để xóa." };
    }

    if (wf.deletedAt) {
      return { ok: false, code: "ALREADY_DELETED", message: "Hồ sơ này đã bị xóa trước đó." };
    }

    // 2. Permission Check
    const allowed = canDeleteWeeklyFile({ actor, weeklyFile: wf });
    if (!allowed) {
      return { ok: false, code: "FORBIDDEN", message: "Bạn không có quyền xóa hồ sơ này." };
    }

    // 3. Atomic Transactional Soft Delete
    const now = new Date();
    try {
      await prisma.$transaction(async (tx) => {
        // Soft-delete parent SafetyWeeklyFile
        await tx.safetyWeeklyFile.update({
          where: { id: wf.id },
          data: {
            deletedAt: now,
            deletedById: actor.id,
          },
        });

        // Soft-delete all linked plans
        await tx.safetyReportPlan.updateMany({
          where: {
            OR: [
              { weeklyFileId: wf.id },
              { periodStart: wf.periodStart, createdById: wf.createdById },
            ],
          },
          data: {
            deletedAt: now,
            deletedById: actor.id,
            status: "CANCELLED",
            cancelledAt: now,
          },
        });

        // Soft-delete all linked assessments
        await tx.safetySelfAssessmentReport.updateMany({
          where: {
            OR: [
              { weeklyFileId: wf.id },
              { periodStart: wf.periodStart, createdById: wf.createdById },
            ],
          },
          data: {
            deletedAt: now,
            deletedById: actor.id,
            status: "CANCELLED",
            cancelledAt: now,
          },
        });

        // Write AuditLog
        await tx.safetyReportAuditLog.create({
          data: {
            reportType: "WEEKLY_FILE",
            reportId: wf.id,
            action: "DELETE",
            actorId: actor.id,
            correlationId: `del_${wf.id}_${now.getTime()}`,
            beforeData: {
              fileCode: wf.fileCode,
              createdById: wf.createdById,
              periodStart: wf.periodStart,
            },
            afterData: {
              deletedAt: now,
              deletedById: actor.id,
            },
          },
        });
      });

      return { ok: true, weeklyFileId: wf.id };
    } catch (err: any) {
      console.error("[SafetyWeeklyFileService.deleteWeeklyFile] Transaction failed:", err);
      return {
        ok: false,
        code: "DELETE_FAILED",
        message: err.message || "Xử lý xóa cơ sở dữ liệu thất bại.",
      };
    }
  }
}
