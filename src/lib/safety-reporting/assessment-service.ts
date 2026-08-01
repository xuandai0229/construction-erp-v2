import prisma from '@/lib/prisma';
import { SafetySelfAssessmentStatus, SafetyReportShift } from '@prisma/client';
import { normalizeNfc, normalizeOptionalReportText } from './date-utils';

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

export class SafetyReportVersionConflictError extends Error {
  public currentVersion?: number;
  constructor(currentVersion?: number, message = 'Báo cáo đã được cập nhật ở phiên làm việc khác. Vui lòng tải lại dữ liệu mới nhất.') {
    super(message);
    this.name = 'SafetyReportVersionConflictError';
    this.currentVersion = currentVersion;
  }
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
    internalNote?: string;
    previousWeekRemediation?: string;
    reinspectionConfirmation?: string;
    managementRecommendation?: string;
    otherOpinion?: string;
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
  }, externalTx?: any) {
    const periodStart = input.periodStart || new Date();
    const year = periodStart.getFullYear();

    const execute = async (tx: any) => {
      const { sequenceNumber, documentNumber } = await this.generateDocumentNumber(tx, year);

      const title = input.title || `BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT`;

      const validProjectIds = Array.from(
        new Set((input.entries || []).map((e) => e.projectId).filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim())))
      );

      const projects = validProjectIds.length > 0
        ? await tx.project.findMany({
            where: { id: { in: validProjectIds } },
            select: { id: true, name: true },
          })
        : [];
      const projectMap = new Map<string, string>(projects.map((p: any) => [p.id, p.name]));

      const report = await tx.safetySelfAssessmentReport.create({
        data: {
          sourcePlanId: input.sourcePlanId || null,
          documentYear: year,
          sequenceNumber,
          documentNumber,
          officialDocumentNumber: normalizeOptionalReportText(input.officialDocumentNumber) || null,
          documentPlace: normalizeOptionalReportText(input.documentPlace) || 'Hà Nội',
          documentDate: input.createdDate || new Date(),
          createdDate: input.createdDate || new Date(),
          title: normalizeNfc(title).trim(),
          periodStart,
          periodEnd: input.periodEnd,
          recipientText: normalizeOptionalReportText(input.recipientText) || 'Ban Giám đốc Công ty; Phòng kỹ thuật',
          reporterName: normalizeOptionalReportText(input.reporterName) || 'Phạm Xuân Quảng',
          reporterTitle: normalizeOptionalReportText(input.reporterTitle) || 'Cán bộ An toàn',
          reporterDepartment: normalizeOptionalReportText(input.reporterDepartment) || 'Phòng kỹ thuật',
          internalNote: normalizeOptionalReportText(input.internalNote) || null,
          previousWeekRemediation: normalizeOptionalReportText(input.previousWeekRemediation) || null,
          reinspectionConfirmation: normalizeOptionalReportText(input.reinspectionConfirmation) || null,
          managementRecommendation: normalizeOptionalReportText(input.managementRecommendation) || null,
          otherOpinion: normalizeOptionalReportText(input.otherOpinion) || null,
          createdById: actorId,
          entries: {
            create: (input.entries || []).map((e, index) => {
              const customName = normalizeOptionalReportText(e.customProjectName) || null;
              const validProjId = e.projectId && projectMap.has(e.projectId) ? e.projectId : null;

              const projName = customName
                ? customName
                : validProjId
                ? projectMap.get(validProjId) || 'Công trình'
                : 'Công trình';

              return {
                inspectionDate: e.inspectionDate || new Date(),
                shift: e.shift || 'MORNING',
                projectId: validProjId,
                customProjectName: customName,
                projectNameSnapshot: projName,
                inspectionContent: normalizeOptionalReportText(e.inspectionContent),
                assessment: normalizeOptionalReportText(e.assessment) || null,
                recommendation: normalizeOptionalReportText(e.recommendation) || null,
                implementationResult: normalizeOptionalReportText(e.implementationResult) || null,
                sortOrder: e.sortOrder ?? index,
              };
            }),
          },
        },
        include: {
          entries: { orderBy: [{ inspectionDate: 'asc' }, { sortOrder: 'asc' }] },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      return report;
    };

    if (externalTx) {
      return await execute(externalTx);
    }
    return await prisma.$transaction(async (tx) => execute(tx));
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
   * Save / Update Safety Assessment Report with Atomic Concurrency Control
   */
  static async saveReport(actorId: string, reportId: string, input: SaveSelfAssessmentInput) {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.safetySelfAssessmentReport.findUnique({
        where: { id: reportId },
        select: { id: true, version: true, deletedAt: true, periodStart: true, periodEnd: true },
      });

      if (!current) throw new Error('Không tìm thấy Báo cáo tự đánh giá');
      if (current.deletedAt) throw new Error('Báo cáo đã bị xóa');

      const expectedVersion = input.expectedLockVersion ?? current.version;

      // 1. Optimistic Concurrency Update using updateMany
      const updateResult = await tx.safetySelfAssessmentReport.updateMany({
        where: {
          id: reportId,
          version: expectedVersion,
          deletedAt: null,
        },
        data: {
          officialDocumentNumber: input.officialDocumentNumber !== undefined ? (normalizeOptionalReportText(input.officialDocumentNumber) || null) : undefined,
          documentPlace: input.documentPlace !== undefined ? (normalizeOptionalReportText(input.documentPlace) || null) : undefined,
          documentDate: input.documentDate && !isNaN(new Date(input.documentDate).getTime()) ? new Date(input.documentDate) : undefined,
          recipientText: input.recipientText !== undefined ? (normalizeOptionalReportText(input.recipientText) || null) : undefined,
          reporterName: input.reporterName !== undefined ? (normalizeOptionalReportText(input.reporterName) || null) : undefined,
          reporterTitle: input.reporterTitle !== undefined ? (normalizeOptionalReportText(input.reporterTitle) || null) : undefined,
          reporterDepartment: input.reporterDepartment !== undefined ? (normalizeOptionalReportText(input.reporterDepartment) || null) : undefined,
          title: input.title !== undefined ? normalizeOptionalReportText(input.title) : undefined,
          internalNote: input.internalNote !== undefined ? (normalizeOptionalReportText(input.internalNote) || null) : undefined,
          previousWeekRemediation: input.previousWeekRemediation !== undefined ? (normalizeOptionalReportText(input.previousWeekRemediation) || null) : undefined,
          reinspectionConfirmation: input.reinspectionConfirmation !== undefined ? (normalizeOptionalReportText(input.reinspectionConfirmation) || null) : undefined,
          managementRecommendation: input.managementRecommendation !== undefined ? (normalizeOptionalReportText(input.managementRecommendation) || null) : undefined,
          otherOpinion: input.otherOpinion !== undefined ? (normalizeOptionalReportText(input.otherOpinion) || null) : undefined,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      console.log('[SAVE_STEP_1_HEADER]', {
        reportId,
        actorId,
        clientExpectedVersion: expectedVersion,
        databaseCurrentVersion: current.version,
        updateCount: updateResult.count,
        entryCount: input.entries?.length || 0,
      });

      if (updateResult.count !== 1) {
        console.warn('[SAVE_VERSION_CONFLICT]', {
          reportId,
          actorId,
          clientExpectedVersion: expectedVersion,
          databaseCurrentVersion: current.version,
          updateCount: updateResult.count,
        });
        throw new SafetyReportVersionConflictError(current.version);
      }

      // 2. Validate Project IDs
      const rawEntries = input.entries || [];
      const validProjectIds = Array.from(
        new Set(rawEntries.map((e) => e.projectId).filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim())))
      );

      const projects = validProjectIds.length > 0
        ? await tx.project.findMany({
            where: { id: { in: validProjectIds } },
            select: { id: true, name: true },
          })
        : [];
      const projectMap = new Map(projects.map((p) => [p.id, p.name]));

      console.log('[SAVE_STEP_2_VALIDATE_ENTRIES]', {
        validProjectCount: projects.length,
        entryCount: rawEntries.length,
      });

      // 3. Re-create entries atomically inside transaction
      console.log('[SAVE_STEP_3_DELETE_ENTRIES]', { reportId });
      await tx.safetySelfAssessmentEntry.deleteMany({
        where: { reportId },
      });

      const validShifts = new Set(['MORNING', 'AFTERNOON', 'EVENING']);

      const cleanEntriesData = rawEntries.map((e, index) => {
        const rawDate = new Date(e.inspectionDate);
        const inspectionDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
        const shift = validShifts.has(e.shift) ? e.shift : 'MORNING';

        const customName = e.customProjectName ? normalizeNfc(e.customProjectName).trim() : null;
        const validProjId = e.projectId && projectMap.has(e.projectId) ? e.projectId : null;

        const projName = customName
          ? customName
          : validProjId
          ? projectMap.get(validProjId) || 'Công trình'
          : 'Công trình';

        return {
          reportId,
          inspectionDate,
          shift,
          projectId: validProjId,
          customProjectName: customName,
          projectNameSnapshot: projName,
          inspectionContent: normalizeNfc(e.inspectionContent || '').trim(),
          assessment: e.assessment ? normalizeNfc(e.assessment).trim() : null,
          recommendation: e.recommendation ? normalizeNfc(e.recommendation).trim() : null,
          implementationResult: e.implementationResult ? normalizeNfc(e.implementationResult).trim() : null,
          sortOrder: e.sortOrder ?? index,
        };
      });

      console.log('[SAVE_STEP_4_CREATE_ENTRIES]', { count: cleanEntriesData.length });
      if (cleanEntriesData.length > 0) {
        await tx.safetySelfAssessmentEntry.createMany({
          data: cleanEntriesData,
        });
      }

      // 4. Return updated report snapshot
      const updatedReport = await tx.safetySelfAssessmentReport.findUnique({
        where: { id: reportId },
        include: {
          entries: {
            orderBy: [{ inspectionDate: 'asc' }, { sortOrder: 'asc' }],
            include: { project: { select: { id: true, name: true, code: true } } },
          },
          createdBy: { select: { id: true, name: true, role: true } },
          sourcePlan: { select: { id: true, documentNumber: true, title: true } },
        },
      });

      if (!updatedReport) {
        throw new Error('Không thể tải lại thông tin Báo cáo sau khi lưu.');
      }

      console.log('[SAVE_STEP_5_COMMIT]', { reportId, newVersion: updatedReport.version });
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
    return {
      ...report,
      officialDocumentNumber: normalizeOptionalReportText(report.officialDocumentNumber),
      documentPlace: normalizeOptionalReportText(report.documentPlace) || 'Hà Nội',
      recipientText: normalizeOptionalReportText(report.recipientText) || 'Ban Giám đốc Công ty; Phòng kỹ thuật',
      reporterName: normalizeOptionalReportText(report.reporterName) || 'Phạm Xuân Quảng',
      reporterTitle: normalizeOptionalReportText(report.reporterTitle) || 'Cán bộ An toàn',
      reporterDepartment: normalizeOptionalReportText(report.reporterDepartment) || 'Phòng kỹ thuật',
      internalNote: normalizeOptionalReportText(report.internalNote),
      previousWeekRemediation: normalizeOptionalReportText(report.previousWeekRemediation),
      reinspectionConfirmation: normalizeOptionalReportText(report.reinspectionConfirmation),
      managementRecommendation: normalizeOptionalReportText(report.managementRecommendation),
      otherOpinion: normalizeOptionalReportText(report.otherOpinion),
      entries: report.entries.map((e) => ({
        ...e,
        inspectionContent: normalizeOptionalReportText(e.inspectionContent),
        assessment: normalizeOptionalReportText(e.assessment),
        recommendation: normalizeOptionalReportText(e.recommendation),
        implementationResult: normalizeOptionalReportText(e.implementationResult),
        customProjectName: normalizeOptionalReportText(e.customProjectName),
      })),
    };
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
