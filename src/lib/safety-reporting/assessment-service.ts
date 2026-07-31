import prisma from '@/lib/prisma';
import { SafetySelfAssessmentStatus, SafetyReportShift } from '@prisma/client';
import { normalizeNfc } from './date-utils';

export interface SaveSelfAssessmentInput {
  expectedLockVersion?: number;
  officialDocumentNumber?: string;
  documentPlace?: string;
  documentDate?: Date;
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
    inspectionDate: Date | string;
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

export class SafetyAssessmentService {
  /**
   * Generates sequential internal document number per year
   */
  static async generateDocumentNumber(tx: any, year: number): Promise<{ sequenceNumber: number; documentNumber: string }> {
    const seq = await tx.safetySelfAssessmentSequence.upsert({
      where: { businessYear: year },
      create: { businessYear: year, nextNumber: 2 },
      update: { nextNumber: { increment: 1 } },
    });
    const num = seq.nextNumber - 1;
    const documentNumber = `BC-ATLD-${year}-${String(num).padStart(4, '0')}`;
    return { sequenceNumber: num, documentNumber };
  }

  /**
   * Creates a new Safety Assessment Report
   */
  static async createReport(actorId: string, input: {
    sourcePlanId?: string;
    title?: string;
    createdDate?: Date;
    periodStart: Date;
    periodEnd: Date;
    officialDocumentNumber?: string;
    documentPlace?: string;
    recipientText?: string;
    reporterName?: string;
    reporterTitle?: string;
    reporterDepartment?: string;
    entries?: Array<{
      inspectionDate: Date;
      shift: SafetyReportShift;
      projectId?: string | null;
      customProjectName?: string | null;
      inspectionContent: string;
      assessment?: string;
      recommendation?: string;
      implementationResult?: string;
      sortOrder?: number;
    }>;
  }) {
    const year = new Date(input.periodStart).getFullYear();

    return await prisma.$transaction(async (tx) => {
      const { sequenceNumber, documentNumber } = await this.generateDocumentNumber(tx, year);
      const titleStr = input.title || `BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT`;

      const initialEntries = input.entries || [];

      const report = await tx.safetySelfAssessmentReport.create({
        data: {
          sourcePlanId: input.sourcePlanId || null,
          documentYear: year,
          sequenceNumber,
          documentNumber,
          officialDocumentNumber: input.officialDocumentNumber ? normalizeNfc(input.officialDocumentNumber) : null,
          documentPlace: input.documentPlace ? normalizeNfc(input.documentPlace) : 'Hà Nội',
          documentDate: input.createdDate || new Date(),
          title: normalizeNfc(titleStr),
          createdDate: input.createdDate || new Date(),
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          recipientText: input.recipientText ? normalizeNfc(input.recipientText) : 'Ban Giám đốc Công ty; Phòng kỹ thuật',
          reporterName: input.reporterName ? normalizeNfc(input.reporterName) : 'Phạm Xuân Quảng',
          reporterTitle: input.reporterTitle ? normalizeNfc(input.reporterTitle) : 'Cán bộ An toàn',
          reporterDepartment: input.reporterDepartment ? normalizeNfc(input.reporterDepartment) : 'Phòng kỹ thuật',
          status: SafetySelfAssessmentStatus.DRAFT,
          createdById: actorId,
          version: 1,
          entries: {
            create: initialEntries.map((e, index) => ({
              inspectionDate: new Date(e.inspectionDate),
              shift: e.shift,
              projectId: e.projectId || null,
              customProjectName: e.customProjectName ? normalizeNfc(e.customProjectName) : null,
              projectNameSnapshot: 'Công trình',
              inspectionContent: normalizeNfc(e.inspectionContent || ''),
              assessment: e.assessment ? normalizeNfc(e.assessment) : null,
              recommendation: e.recommendation ? normalizeNfc(e.recommendation) : null,
              implementationResult: e.implementationResult ? normalizeNfc(e.implementationResult) : null,
              sortOrder: e.sortOrder ?? index,
            })),
          },
        },
        include: {
          entries: { orderBy: [{ inspectionDate: 'asc' }, { sortOrder: 'asc' }] },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      return report;
    });
  }

  /**
   * Create report from approved Plan
   */
  static async createFromPlan(actorId: string, planId: string) {
    const plan = await prisma.safetyReportPlan.findUnique({
      where: { id: planId },
      include: { entries: true },
    });
    if (!plan) throw new Error('Không tìm thấy Kế hoạch kiểm tra');

    const title = `BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT - TUẦN (${new Date(plan.periodStart).toLocaleDateString('vi-VN')} ĐẾN ${new Date(plan.periodEnd).toLocaleDateString('vi-VN')})`;

    return await this.createReport(actorId, {
      sourcePlanId: plan.id,
      title,
      periodStart: plan.periodStart,
      periodEnd: plan.periodEnd,
      entries: plan.entries.map((e) => ({
        inspectionDate: e.inspectionDate,
        shift: e.shift,
        projectId: e.projectId,
        inspectionContent: e.inspectionContent,
        assessment: 'Đạt yêu cầu an toàn',
        recommendation: 'Duy trì công tác vệ sinh và bảo hộ',
        implementationResult: 'Đã thực hiện tốt',
        sortOrder: e.sortOrder,
      })),
    });
  }

  /**
   * Save / Update Safety Assessment Report with Concurrency Control
   */
  static async saveReport(actorId: string, reportId: string, input: SaveSelfAssessmentInput) {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.safetySelfAssessmentReport.findUnique({
        where: { id: reportId },
      });

      if (!current) throw new Error('Không tìm thấy Báo cáo tự đánh giá');
      if (current.deletedAt) throw new Error('Báo cáo đã bị xóa');

      if (
        input.expectedLockVersion !== undefined &&
        input.expectedLockVersion !== current.version
      ) {
        throw new Error(
          'CONFLICT: Báo cáo đã được chỉnh sửa bởi phiên làm việc khác. Vui lòng tải lại trang.'
        );
      }

      const validProjectIds = Array.from(
        new Set(input.entries.map((e) => e.projectId).filter(Boolean))
      ) as string[];

      const projects = validProjectIds.length > 0
        ? await tx.project.findMany({
            where: { id: { in: validProjectIds } },
            select: { id: true, name: true },
          })
        : [];
      const projectMap = new Map(projects.map((p) => [p.id, p.name]));

      await tx.safetySelfAssessmentEntry.deleteMany({
        where: { reportId },
      });

      const nextVersion = current.version + 1;

      const updatedReport = await tx.safetySelfAssessmentReport.update({
        where: { id: reportId },
        data: {
          officialDocumentNumber: input.officialDocumentNumber !== undefined ? normalizeNfc(input.officialDocumentNumber) : current.officialDocumentNumber,
          documentPlace: input.documentPlace !== undefined ? normalizeNfc(input.documentPlace) : current.documentPlace,
          documentDate: input.documentDate ? new Date(input.documentDate) : current.documentDate,
          recipientText: input.recipientText !== undefined ? normalizeNfc(input.recipientText) : current.recipientText,
          reporterName: input.reporterName !== undefined ? normalizeNfc(input.reporterName) : current.reporterName,
          reporterTitle: input.reporterTitle !== undefined ? normalizeNfc(input.reporterTitle) : current.reporterTitle,
          reporterDepartment: input.reporterDepartment !== undefined ? normalizeNfc(input.reporterDepartment) : current.reporterDepartment,
          internalNote: input.internalNote !== undefined ? normalizeNfc(input.internalNote) : current.internalNote,
          previousWeekRemediation: input.previousWeekRemediation !== undefined ? normalizeNfc(input.previousWeekRemediation) : current.previousWeekRemediation,
          reinspectionConfirmation: input.reinspectionConfirmation !== undefined ? normalizeNfc(input.reinspectionConfirmation) : current.reinspectionConfirmation,
          managementRecommendation: input.managementRecommendation !== undefined ? normalizeNfc(input.managementRecommendation) : current.managementRecommendation,
          otherOpinion: input.otherOpinion !== undefined ? normalizeNfc(input.otherOpinion) : current.otherOpinion,
          version: nextVersion,
          entries: {
            create: input.entries.map((e, index) => {
              const projName = e.customProjectName
                ? normalizeNfc(e.customProjectName)
                : e.projectId
                ? projectMap.get(e.projectId) || 'Công trình'
                : 'Công trình';

              return {
                inspectionDate: new Date(e.inspectionDate),
                shift: e.shift,
                projectId: e.projectId || null,
                customProjectName: e.customProjectName ? normalizeNfc(e.customProjectName) : null,
                projectNameSnapshot: projName,
                inspectionContent: normalizeNfc(e.inspectionContent || ''),
                assessment: e.assessment ? normalizeNfc(e.assessment) : null,
                recommendation: e.recommendation ? normalizeNfc(e.recommendation) : null,
                implementationResult: e.implementationResult ? normalizeNfc(e.implementationResult) : null,
                sortOrder: e.sortOrder ?? index,
              };
            }),
          },
        },
        include: {
          entries: {
            orderBy: [{ inspectionDate: 'asc' }, { sortOrder: 'asc' }],
            include: { project: { select: { id: true, name: true, code: true } } },
          },
          createdBy: { select: { id: true, name: true, role: true } },
          sourcePlan: { select: { id: true, documentNumber: true, title: true } },
        },
      });

      return updatedReport;
    });
  }

  /**
   * Import schedule/entries from a Safety Plan into Safety Report
   */
  static async importEntriesFromPlan(actorId: string, reportId: string, planId: string) {
    const plan = await prisma.safetyReportPlan.findUnique({
      where: { id: planId },
      include: { entries: { include: { project: true } } },
    });

    if (!plan) throw new Error('Không tìm thấy Kế hoạch kiểm tra');

    const report = await prisma.safetySelfAssessmentReport.findUnique({
      where: { id: reportId },
      include: { entries: true },
    });

    if (!report) throw new Error('Không tìm thấy Báo cáo tự đánh giá');

    const existingMap = new Map();
    report.entries.forEach((e) => {
      const key = `${new Date(e.inspectionDate).toISOString().split('T')[0]}_${e.shift}`;
      existingMap.set(key, e);
    });

    const newEntriesPayload = plan.entries.map((pEntry, idx) => {
      const key = `${new Date(pEntry.inspectionDate).toISOString().split('T')[0]}_${pEntry.shift}`;
      const existing = existingMap.get(key);

      return {
        inspectionDate: pEntry.inspectionDate,
        shift: pEntry.shift,
        projectId: pEntry.projectId || null,
        customProjectName: pEntry.location || null,
        inspectionContent: pEntry.inspectionContent,
        assessment: existing?.assessment || '',
        recommendation: existing?.recommendation || '',
        implementationResult: existing?.implementationResult || '',
        sortOrder: idx,
      };
    });

    return await this.saveReport(actorId, reportId, {
      expectedLockVersion: report.version,
      entries: newEntriesPayload,
    });
  }

  /**
   * Submit Report for Approval
   */
  static async submitReport(actorId: string, reportId: string) {
    return await prisma.$transaction(async (tx) => {
      const report = await tx.safetySelfAssessmentReport.findUnique({ where: { id: reportId } });
      if (!report) throw new Error('Không tìm thấy Báo cáo');
      if (report.status !== SafetySelfAssessmentStatus.DRAFT && report.status !== SafetySelfAssessmentStatus.REVISION_REQUIRED) {
        throw new Error('Chỉ có thể trình duyệt Báo cáo ở trạng thái Bản nháp hoặc Yêu cầu chỉnh sửa');
      }

      const updated = await tx.safetySelfAssessmentReport.update({
        where: { id: reportId },
        data: {
          status: SafetySelfAssessmentStatus.PENDING_APPROVAL,
          submittedById: actorId,
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await tx.safetyReportApprovalHistory.create({
        data: {
          reportType: 'SELF_ASSESSMENT',
          reportId,
          fromStatus: report.status,
          toStatus: SafetySelfAssessmentStatus.PENDING_APPROVAL,
          actorId,
        },
      });

      return updated;
    });
  }

  /**
   * Decide Report Approval / Revision Request
   */
  static async decideReport(actorId: string, reportId: string, approve: boolean, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      const report = await tx.safetySelfAssessmentReport.findUnique({ where: { id: reportId } });
      if (!report) throw new Error('Không tìm thấy Báo cáo');
      if (report.status !== SafetySelfAssessmentStatus.PENDING_APPROVAL) {
        throw new Error('Báo cáo không ở trạng thái Chờ duyệt');
      }

      const newStatus = approve ? SafetySelfAssessmentStatus.APPROVED : SafetySelfAssessmentStatus.REVISION_REQUIRED;

      const updated = await tx.safetySelfAssessmentReport.update({
        where: { id: reportId },
        data: {
          status: newStatus,
          approvedById: approve ? actorId : report.approvedById,
          approvedAt: approve ? new Date() : report.approvedAt,
          revisionReason: approve ? null : reason,
          version: { increment: 1 },
        },
      });

      await tx.safetyReportApprovalHistory.create({
        data: {
          reportType: 'SELF_ASSESSMENT',
          reportId,
          fromStatus: report.status,
          toStatus: newStatus,
          actorId,
          reason,
        },
      });

      return updated;
    });
  }

  /**
   * Delete or Cancel Report
   */
  static async deleteOrCancelReport(actorId: string, reportId: string, cancellationReason?: string) {
    return await prisma.$transaction(async (tx) => {
      const report = await tx.safetySelfAssessmentReport.findUnique({ where: { id: reportId } });
      if (!report) throw new Error('Không tìm thấy Báo cáo');

      if (report.status === SafetySelfAssessmentStatus.DRAFT) {
        await tx.safetySelfAssessmentReport.delete({ where: { id: reportId } });
        return { deleted: true, reportId };
      } else {
        const updated = await tx.safetySelfAssessmentReport.update({
          where: { id: reportId },
          data: {
            status: SafetySelfAssessmentStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: cancellationReason || 'Người dùng hủy hồ sơ',
            version: { increment: 1 },
          },
        });

        await tx.safetyReportApprovalHistory.create({
          data: {
            reportType: 'SELF_ASSESSMENT',
            reportId,
            fromStatus: report.status,
            toStatus: SafetySelfAssessmentStatus.CANCELLED,
            actorId,
            reason: cancellationReason,
          },
        });

        return { deleted: false, cancelled: true, report: updated };
      }
    });
  }

  /**
   * List Safety Assessment Reports
   */
  static async listReports(params?: { status?: SafetySelfAssessmentStatus; search?: string; projectId?: string; limit?: number; offset?: number }) {
    const where: any = {
      deletedAt: null,
    };

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.search) {
      where.OR = [
        { documentNumber: { contains: params.search, mode: 'insensitive' } },
        { officialDocumentNumber: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { reporterName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params?.projectId) {
      where.entries = {
        some: { projectId: params.projectId },
      };
    }

    const [items, total] = await Promise.all([
      prisma.safetySelfAssessmentReport.findMany({
        where,
        take: params?.limit ?? 50,
        skip: params?.offset ?? 0,
        orderBy: { periodStart: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          sourcePlan: { select: { id: true, documentNumber: true, title: true } },
          entries: { select: { id: true, projectNameSnapshot: true } },
        },
      }),
      prisma.safetySelfAssessmentReport.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Get Report By ID
   */
  static async getReportById(id: string) {
    const report = await prisma.safetySelfAssessmentReport.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        sourcePlan: { select: { id: true, documentNumber: true, title: true } },
        entries: {
          orderBy: [{ inspectionDate: 'asc' }, { sortOrder: 'asc' }],
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!report || report.deletedAt) return null;
    return report;
  }

  /**
   * Delete Report
   */
  static async deleteReport(actorId: string, reportId: string) {
    return await prisma.safetySelfAssessmentReport.update({
      where: { id: reportId },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
    });
  }
}
