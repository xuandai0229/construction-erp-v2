import prisma from '@/lib/prisma';
import { SafetySelfAssessmentStatus, SafetyReportShift } from '@prisma/client';

export interface CreateSelfAssessmentInput {
  sourcePlanId?: string;
  title: string;
  createdDate: Date;
  periodStart: Date;
  periodEnd: Date;
  legalBases?: string[];
  recipients?: string[];
  previousWeekRemediation?: string;
  reinspectionConfirmation?: string;
  managementRecommendation?: string;
  otherOpinion?: string;
  entries: Array<{
    inspectionDate: Date;
    shift: SafetyReportShift;
    projectId: string;
    inspectionContent: string;
    assessment?: string;
    recommendation?: string;
    implementationResult?: string;
    sortOrder?: number;
  }>;
}

export class SafetyAssessmentService {
  /**
   * Sinh số báo cáo tự đánh giá tự động theo năm
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
   * Tạo Báo cáo tự đánh giá mới (có thể kế thừa từ Kế hoạch kiểm tra)
   */
  static async createReport(actorId: string, input: CreateSelfAssessmentInput) {
    const year = new Date(input.createdDate).getFullYear();

    return await prisma.$transaction(async (tx) => {
      const { sequenceNumber, documentNumber } = await this.generateDocumentNumber(tx, year);

      const projectIds = Array.from(new Set(input.entries.map((e) => e.projectId)));
      const projects = await tx.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      });
      const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

      const report = await tx.safetySelfAssessmentReport.create({
        data: {
          sourcePlanId: input.sourcePlanId,
          documentYear: year,
          sequenceNumber,
          documentNumber,
          title: input.title,
          createdDate: input.createdDate,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          legalBases: input.legalBases ?? [
            'Căn cứ Quyết định giao việc của lãnh đạo Công ty.',
            'Căn cứ kế hoạch kiểm tra công trình hàng tuần.',
            'Căn cứ các biên bản kiểm tra an toàn, vệ sinh lao động.',
          ],
          recipients: input.recipients ?? ['Ban Giám đốc Công ty', 'Phòng kỹ thuật'],
          previousWeekRemediation: input.previousWeekRemediation,
          reinspectionConfirmation: input.reinspectionConfirmation,
          managementRecommendation: input.managementRecommendation,
          otherOpinion: input.otherOpinion,
          status: SafetySelfAssessmentStatus.DRAFT,
          createdById: actorId,
          entries: {
            create: input.entries.map((e, index) => ({
              inspectionDate: e.inspectionDate,
              shift: e.shift,
              projectId: e.projectId,
              projectNameSnapshot: projectMap.get(e.projectId) || 'Công trình',
              inspectionContent: e.inspectionContent,
              assessment: e.assessment,
              recommendation: e.recommendation,
              implementationResult: e.implementationResult,
              sortOrder: e.sortOrder ?? index,
            })),
          },
        },
        include: {
          entries: { orderBy: { sortOrder: 'asc' } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      // Audit Log
      await tx.safetyReportAuditLog.create({
        data: {
          reportType: 'SELF_ASSESSMENT',
          reportId: report.id,
          action: 'CREATE',
          afterData: report as any,
          actorId,
          correlationId: `assessment-create-${report.id}`,
        },
      });

      return report;
    });
  }

  /**
   * Khởi tạo Báo cáo tự đánh giá từ Kế hoạch đã duyệt
   */
  static async createFromPlan(actorId: string, planId: string) {
    const plan = await prisma.safetyReportPlan.findUnique({
      where: { id: planId },
      include: { entries: true },
    });
    if (!plan) throw new Error('Không tìm thấy Kế hoạch kiểm tra');
    if (plan.status !== 'APPROVED') {
      throw new Error('Chỉ có thể tạo báo cáo từ Kế hoạch đã được duyệt');
    }

    const title = `BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT - TUẦN (${new Date(plan.periodStart).toLocaleDateString('vi-VN')} ĐẾN ${new Date(plan.periodEnd).toLocaleDateString('vi-VN')})`;

    return await this.createReport(actorId, {
      sourcePlanId: plan.id,
      title,
      createdDate: new Date(),
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
   * Danh sách Báo cáo tự đánh giá
   */
  static async listReports(params?: { status?: SafetySelfAssessmentStatus; search?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.search) {
      where.OR = [
        { documentNumber: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.safetySelfAssessmentReport.findMany({
        where,
        take: params?.limit ?? 50,
        skip: params?.offset ?? 0,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          sourcePlan: { select: { id: true, documentNumber: true } },
          entries: { select: { id: true, projectNameSnapshot: true } },
        },
      }),
      prisma.safetySelfAssessmentReport.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Chi tiết Báo cáo
   */
  static async getReportById(id: string) {
    return await prisma.safetySelfAssessmentReport.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        sourcePlan: { select: { id: true, documentNumber: true, title: true } },
        entries: {
          orderBy: [{ inspectionDate: 'asc' }, { sortOrder: 'asc' }],
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
    });
  }

  /**
   * Trình duyệt Báo cáo
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
   * Duyệt hoặc Yêu cầu chỉnh sửa Báo cáo
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
   * Xóa bản nháp / Hủy Báo cáo
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
}
