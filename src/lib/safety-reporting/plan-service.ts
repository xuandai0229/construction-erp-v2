import prisma from '@/lib/prisma';
import { SafetyReportPlanStatus, SafetyReportShift, SafetyReportConstructionType } from '@prisma/client';

export interface CreateSafetyPlanInput {
  title: string;
  createdDate: Date;
  periodStart: Date;
  periodEnd: Date;
  legalBases?: string[];
  recipients?: string[];
  purpose?: string;
  note?: string;
  entries: Array<{
    inspectionDate: Date;
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

export interface UpdateSafetyPlanInput extends Partial<CreateSafetyPlanInput> {
  version: number;
}

export class SafetyPlanService {
  /**
   * Sinh số kế hoạch tự động theo năm
   */
  static async generateDocumentNumber(tx: any, year: number): Promise<{ sequenceNumber: number; documentNumber: string }> {
    const seq = await tx.safetyReportPlanSequence.upsert({
      where: { businessYear: year },
      create: { businessYear: year, nextNumber: 2 },
      update: { nextNumber: { increment: 1 } },
    });
    const num = seq.nextNumber - 1;
    const documentNumber = `KH-ATLD-${year}-${String(num).padStart(4, '0')}`;
    return { sequenceNumber: num, documentNumber };
  }

  /**
   * Tạo kế hoạch kiểm tra mới
   */
  static async createPlan(actorId: string, input: CreateSafetyPlanInput, externalTx?: any) {
    const year = new Date(input.createdDate).getFullYear();

    const execute = async (tx: any) => {
      const { sequenceNumber, documentNumber } = await this.generateDocumentNumber(tx, year);

      // Lấy snapshot tên công trình cho từng entry
      const projectIds = Array.from(new Set(input.entries.map((e) => e.projectId)));
      const projects = await tx.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      });
      const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

      const plan = await tx.safetyReportPlan.create({
        data: {
          documentYear: year,
          sequenceNumber,
          documentNumber,
          title: input.title,
          createdDate: input.createdDate,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          legalBases: input.legalBases ?? [
            'Căn cứ Quyết định giao nhiệm vụ của Ban lãnh đạo Công ty;',
            'Căn cứ Các hợp đồng giao khoán giữa công ty và các tổ đội.',
          ],
          recipients: input.recipients ?? ['Ban lãnh đạo công ty', 'Phòng kỹ thuật', 'Ban chỉ huy các công trình'],
          purpose: input.purpose,
          note: input.note,
          status: SafetyReportPlanStatus.DRAFT,
          createdById: actorId,
          entries: {
            create: input.entries.map((e, index) => ({
              inspectionDate: e.inspectionDate,
              shift: e.shift,
              projectId: e.projectId,
              projectNameSnapshot: projectMap.get(e.projectId) || 'Công trình',
              constructionType: e.constructionType ?? SafetyReportConstructionType.BUILDING,
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
          entries: { orderBy: { sortOrder: 'asc' } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      // Audit Log
      await tx.safetyReportAuditLog.create({
        data: {
          reportType: 'PLAN',
          reportId: plan.id,
          action: 'CREATE',
          afterData: plan as any,
          actorId,
          correlationId: `plan-create-${plan.id}`,
        },
      });

      return plan;
    };

    if (externalTx) {
      return await execute(externalTx);
    }
    return await prisma.$transaction(async (tx) => execute(tx));
  }

  /**
   * Danh sách kế hoạch
   */
  static async listPlans(params?: { status?: SafetyReportPlanStatus; search?: string; limit?: number; offset?: number }) {
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
      prisma.safetyReportPlan.findMany({
        where,
        take: params?.limit ?? 50,
        skip: params?.offset ?? 0,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          entries: { select: { id: true, projectNameSnapshot: true } },
        },
      }),
      prisma.safetyReportPlan.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Lấy chi tiết 1 kế hoạch
   */
  static async getPlanById(id: string) {
    return await prisma.safetyReportPlan.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        entries: {
          orderBy: [{ inspectionDate: 'asc' }, { sortOrder: 'asc' }],
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
    });
  }

  /**
   * Trình duyệt kế hoạch
   */
  static async submitPlan(actorId: string, planId: string) {
    return await prisma.$transaction(async (tx) => {
      const plan = await tx.safetyReportPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new Error('Không tìm thấy kế hoạch');
      if (plan.status !== SafetyReportPlanStatus.DRAFT && plan.status !== SafetyReportPlanStatus.REVISION_REQUIRED) {
        throw new Error('Chỉ có thể trình duyệt kế hoạch ở trạng thái Bản nháp hoặc Yêu cầu chỉnh sửa');
      }

      const updated = await tx.safetyReportPlan.update({
        where: { id: planId },
        data: {
          status: SafetyReportPlanStatus.PENDING_APPROVAL,
          submittedById: actorId,
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await tx.safetyReportApprovalHistory.create({
        data: {
          reportType: 'PLAN',
          reportId: planId,
          fromStatus: plan.status,
          toStatus: SafetyReportPlanStatus.PENDING_APPROVAL,
          actorId,
        },
      });

      return updated;
    });
  }

  /**
   * Duyệt hoặc Yêu cầu chỉnh sửa kế hoạch
   */
  static async decidePlan(actorId: string, planId: string, approve: boolean, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      const plan = await tx.safetyReportPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new Error('Không tìm thấy kế hoạch');
      if (plan.status !== SafetyReportPlanStatus.PENDING_APPROVAL) {
        throw new Error('Kế hoạch không ở trạng thái Chờ duyệt');
      }

      const newStatus = approve ? SafetyReportPlanStatus.APPROVED : SafetyReportPlanStatus.REVISION_REQUIRED;

      const updated = await tx.safetyReportPlan.update({
        where: { id: planId },
        data: {
          status: newStatus,
          approvedById: approve ? actorId : plan.approvedById,
          approvedAt: approve ? new Date() : plan.approvedAt,
          revisionReason: approve ? null : reason,
          version: { increment: 1 },
        },
      });

      await tx.safetyReportApprovalHistory.create({
        data: {
          reportType: 'PLAN',
          reportId: planId,
          fromStatus: plan.status,
          toStatus: newStatus,
          actorId,
          reason,
        },
      });

      return updated;
    });
  }

  /**
   * Xóa bản nháp (hard-delete) hoặc Hủy kế hoạch (soft-delete status CANCELLED)
   */
  static async deleteOrCancelPlan(actorId: string, planId: string, cancellationReason?: string) {
    return await prisma.$transaction(async (tx) => {
      const plan = await tx.safetyReportPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new Error('Không tìm thấy kế hoạch');

      if (plan.status === SafetyReportPlanStatus.DRAFT) {
        // Hard-delete bản nháp chưa trình
        await tx.safetyReportPlan.delete({ where: { id: planId } });
        return { deleted: true, planId };
      } else {
        // Chuyển trạng thái sang CANCELLED
        const updated = await tx.safetyReportPlan.update({
          where: { id: planId },
          data: {
            status: SafetyReportPlanStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: cancellationReason || 'Người dùng hủy hồ sơ',
            version: { increment: 1 },
          },
        });

        await tx.safetyReportApprovalHistory.create({
          data: {
            reportType: 'PLAN',
            reportId: planId,
            fromStatus: plan.status,
            toStatus: SafetyReportPlanStatus.CANCELLED,
            actorId,
            reason: cancellationReason,
          },
        });

        return { deleted: false, cancelled: true, plan: updated };
      }
    });
  }
}
