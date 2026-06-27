"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  ApprovalPriority,
  ApprovalRequestType,
  Prisma,
  ProjectRole,
  UserRole,
} from "@prisma/client";
import {
  assertCanApproveApproval,
  assertCanCancelApproval,
  assertCanRejectApproval,
  assertCanSoftDeleteApproval,
  assertCanUpdateApproval,
  canViewApproval,
  getApprovalPermissionSet,
  type ApprovalActor,
} from "@/lib/approvals/approval-permissions";
import {
  buildApprovalSummary,
  serializeApprovalRequest,
  type ApprovalProjectOptionDto,
  type ApprovalRequestDto,
  type ApprovalSummaryDto,
} from "@/lib/approvals/approval-dto";

const APPROVALS_PATH = "/approvals";

export type ApprovalsDataDto = {
  approvals: ApprovalRequestDto[];
  projects: ApprovalProjectOptionDto[];
  summary: ApprovalSummaryDto;
  canCreate: boolean;
  currentUserId: string | null;
};

type CreateApprovalRequestInput = {
  projectId: string;
  title: string;
  description?: string | null;
  type: ApprovalRequestType;
  priority: ApprovalPriority;
  amount?: number | string | null;
  dueDate?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function isHighLevelViewRole(role: UserRole) {
  return role === "ADMIN" || role === "DIRECTOR" || role === "DEPUTY_DIRECTOR" || role === "MANAGER";
}

function canCreateInAnyProject(role: UserRole, memberships: { role: ProjectRole }[]) {
  if (isHighLevelViewRole(role) || role === "ACCOUNTANT") return true;
  return memberships.length > 0;
}

async function getActiveProjectRoles(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId, isActive: true, deletedAt: null, leftAt: null },
    select: { projectId: true, role: true },
  });

  return {
    memberships,
    roleByProject: new Map(memberships.map((membership) => [membership.projectId, membership.role])),
  };
}

function buildApprovalWhere(
  actor: ApprovalActor,
  projectIds: string[],
): Prisma.ApprovalRequestWhereInput {
  const base: Prisma.ApprovalRequestWhereInput = {
    deletedAt: null,
    project: { deletedAt: null },
  };

  if (isHighLevelViewRole(actor.role)) return base;

  const scopedOr: Prisma.ApprovalRequestWhereInput[] = [
    { requesterId: actor.id },
  ];

  if (projectIds.length > 0) {
    scopedOr.push({ projectId: { in: projectIds } });
  }

  if (actor.role === "ACCOUNTANT") {
    scopedOr.push({ type: "PAYMENT" });
  }

  return { ...base, OR: scopedOr };
}

async function getProjectsForActor(
  actor: ApprovalActor,
  projectIds: string[],
) {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (!isHighLevelViewRole(actor.role) && actor.role !== "ACCOUNTANT") {
    where.id = { in: projectIds };
  }

  return prisma.project.findMany({
    where,
    select: { id: true, code: true, name: true },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  });
}

export async function getApprovalsData(): Promise<ApprovalsDataDto> {
  const session = await getSession();
  if (!session) {
    return {
      approvals: [],
      projects: [],
      summary: buildApprovalSummary([]),
      canCreate: false,
      currentUserId: null,
    };
  }

  const actor: ApprovalActor = { id: session.id, role: session.role };
  const { memberships, roleByProject } = await getActiveProjectRoles(session.id);
  const projectIds = memberships.map((membership) => membership.projectId);

  const [approvalRecords, projects] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: buildApprovalWhere(actor, projectIds),
      include: {
        project: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, name: true } },
        decidedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    getProjectsForActor(actor, projectIds),
  ]);

  const approvals = approvalRecords
    .filter((approval) => canViewApproval(actor, approval, roleByProject))
    .map((approval) => {
      const dto = serializeApprovalRequest(approval);
      return {
        ...dto,
        permissions: getApprovalPermissionSet(actor, approval, roleByProject),
      };
    });

  return {
    approvals,
    projects,
    summary: buildApprovalSummary(approvals),
    canCreate: canCreateInAnyProject(session.role, memberships),
    currentUserId: session.id,
  };
}

async function assertCanCreateApproval(
  actor: ApprovalActor,
  projectId: string,
  type: ApprovalRequestType,
) {
  if (isHighLevelViewRole(actor.role)) return;
  if (actor.role === "ACCOUNTANT" && type === "PAYMENT") return;

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId: actor.id, isActive: true, deletedAt: null, leftAt: null },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Bạn không có quyền tạo yêu cầu phê duyệt cho công trình này");
  }
}

async function generateApprovalCode() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const code = `APR-${y}${m}${d}-${suffix}`;
    const existing = await prisma.approvalRequest.findUnique({ where: { code } });
    if (!existing) return code;
  }

  return `APR-${Date.now()}`;
}

export async function createApprovalRequest(data: CreateApprovalRequestInput) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const projectId = normalizeText(data.projectId);
  if (!projectId) throw new Error("Chưa chọn công trình");

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw new Error("Công trình không tồn tại hoặc đã bị xóa");

  const title = normalizeText(data.title);
  if (title.length < 3) throw new Error("Tiêu đề yêu cầu là bắt buộc");

  const type = data.type;
  const priority = data.priority;
  await assertCanCreateApproval({ id: session.id, role: session.role }, projectId, type);

  const amount = data.amount === null || data.amount === undefined || data.amount === ""
    ? null
    : Number(data.amount);
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
    throw new Error("Số tiền phải lớn hơn hoặc bằng 0");
  }

  const dueDate = normalizeOptionalText(data.dueDate);
  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
    throw new Error("Hạn xử lý không hợp lệ");
  }

  const code = await generateApprovalCode();

  await prisma.approvalRequest.create({
    data: {
      code,
      projectId,
      title,
      description: normalizeOptionalText(data.description),
      type,
      priority,
      amount,
      dueDate: parsedDueDate,
      requesterId: session.id,
      status: "PENDING",
      sourceType: normalizeOptionalText(data.sourceType),
      sourceId: normalizeOptionalText(data.sourceId),
    },
  });

  revalidatePath(APPROVALS_PATH);
  return { ok: true };
}

export type UpdateApprovalRequestInput = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  priority: ApprovalPriority;
  amount?: number | string | null;
  dueDate?: string | null;
};

export async function updateApprovalRequest(data: UpdateApprovalRequestInput) {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  const approval = await prisma.approvalRequest.findFirst({
    where: { id: data.id, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      requesterId: true,
      status: true,
      type: true,
      deletedAt: true,
      sourceId: true,
      sourceType: true,
    },
  });
  if (!approval) throw new Error("Yêu cầu phê duyệt không tồn tại hoặc đã bị xóa");

  const actor: ApprovalActor = { id: session.id, role: session.role };
  const projectRoles = await getProjectRoleMapForDecision(actor, approval.projectId);

  assertCanUpdateApproval(actor, approval, projectRoles);

  if (approval.projectId !== data.projectId) {
    await assertCanCreateApproval(actor, data.projectId, approval.type);
  }

  const title = normalizeText(data.title);
  if (title.length < 3) throw new Error("Tiêu đề yêu cầu là bắt buộc");

  const amount = data.amount === null || data.amount === undefined || data.amount === ""
    ? null
    : Number(data.amount);
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
    throw new Error("Số tiền phải lớn hơn hoặc bằng 0");
  }

  const dueDate = normalizeOptionalText(data.dueDate);
  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
    throw new Error("Hạn xử lý không hợp lệ");
  }

  await prisma.approvalRequest.update({
    where: { id: approval.id },
    data: {
      projectId: data.projectId,
      title,
      description: normalizeOptionalText(data.description),
      priority: data.priority,
      amount,
      dueDate: parsedDueDate,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      projectId: approval.projectId,
      action: "APPROVAL_REQUEST_UPDATED",
      entityType: "ApprovalRequest",
      entityId: approval.id,
      afterData: JSON.stringify({ title, projectId: data.projectId, amount, dueDate: parsedDueDate }),
    },
  });

  revalidatePath(APPROVALS_PATH);
  return { ok: true };
}

async function getApprovalForDecision(id: string) {
  const approval = await prisma.approvalRequest.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      requesterId: true,
      status: true,
      type: true,
      sourceId: true,
      sourceType: true,
      amount: true,
      deletedAt: true,
    },
  });
  if (!approval) throw new Error("Yêu cầu phê duyệt không tồn tại");
  return approval;
}

async function syncSourceOnApprovalTx(
  tx: Prisma.TransactionClient,
  approval: { type: ApprovalRequestType; sourceId: string | null; amount: any; id: string },
  actorId: string,
  decision: "APPROVED" | "REJECTED",
  note: string | null
) {
  if (["CHANGE_ORDER", "OTHER"].includes(approval.type)) {
     throw new Error("Loại phê duyệt này chưa hỗ trợ đồng bộ tự động. Vui lòng xử lý ở phân hệ gốc.");
  }
  if (!approval.sourceId) {
     throw new Error("Không thể duyệt vì yêu cầu phê duyệt không có bản ghi gốc để đồng bộ.");
  }

  const now = new Date();

  switch (approval.type) {
    case "PAYMENT": {
      const payment = await tx.paymentRequest.findUnique({
        where: { id: approval.sourceId }
      });
      if (!payment || payment.deletedAt) {
        throw new Error("Không thể duyệt vì bản ghi gốc không tồn tại hoặc đã bị xóa.");
      }
      const validStatuses = ["SUBMITTED"]; // Adjust if DRAFT is allowed, but usually SUBMITTED
      if (!validStatuses.includes(payment.status)) {
        throw new Error(`Trạng thái phiếu thanh toán hiện tại (${payment.status}) không cho phép phê duyệt.`);
      }

      // Check Contract Limit only on APPROVE
      if (decision === "APPROVED" && payment.contractId) {
         const contract = await tx.contract.findUnique({ where: { id: payment.contractId } });
         if (!contract || contract.deletedAt) throw new Error("Hợp đồng không tồn tại hoặc đã bị xóa.");
         
         const otherPayments = await tx.paymentRequest.findMany({
           where: {
             contractId: payment.contractId,
             deletedAt: null,
             status: { in: ["DRAFT", "SUBMITTED", "APPROVED", "PAID"] },
             id: { not: payment.id }
           },
           select: { totalAmount: true }
         });
         const usedAmount = otherPayments.reduce((sum, p) => sum + Number(p.totalAmount), 0);
         if (usedAmount + Number(payment.totalAmount) > Number(contract.value)) {
           throw new Error("Tổng đề nghị thanh toán vượt giá trị hợp đồng.");
         }
      }

      await tx.paymentRequest.update({
        where: { id: payment.id },
        data: decision === "APPROVED" ? {
          status: "APPROVED",
          approvedById: actorId,
          approvedAt: now,
        } : {
          status: "REJECTED",
          rejectedReason: note ?? undefined,
        }
      });
      break;
    }
    case "CONTRACT": {
      const contract = await tx.contract.findUnique({
        where: { id: approval.sourceId }
      });
      if (!contract || contract.deletedAt) throw new Error("Không thể duyệt vì bản ghi gốc không tồn tại hoặc đã bị xóa.");
      if (contract.status !== "DRAFT") throw new Error(`Trạng thái hợp đồng hiện tại (${contract.status}) không cho phép phê duyệt.`);
      
      await tx.contract.update({
        where: { id: contract.id },
        data: decision === "APPROVED" ? {
          status: "ACTIVE",
        } : {
          status: "DRAFT", // keep draft or whatever
        }
      });
      break;
    }
    case "MATERIAL": {
      const matReq = await tx.materialRequest.findUnique({
        where: { id: approval.sourceId }
      });
      if (!matReq || matReq.deletedAt) throw new Error("Không thể duyệt vì bản ghi gốc không tồn tại hoặc đã bị xóa.");
      if (!["DRAFT", "REQUESTED", "SUBMITTED"].includes(matReq.status)) {
         throw new Error(`Trạng thái phiếu yêu cầu vật tư hiện tại (${matReq.status}) không cho phép phê duyệt.`);
      }
      await tx.materialRequest.update({
        where: { id: matReq.id },
        data: decision === "APPROVED" ? {
          status: "APPROVED",
        } : {
          status: "REJECTED",
        }
      });
      break;
    }
    case "REPORT": {
      const report = await tx.siteReport.findUnique({
        where: { id: approval.sourceId }
      });
      if (!report || report.deletedAt) throw new Error("Không thể duyệt vì bản ghi gốc không tồn tại hoặc đã bị xóa.");
      if (!["DRAFT", "SUBMITTED"].includes(report.status)) throw new Error(`Trạng thái báo cáo hiện tại (${report.status}) không cho phép phê duyệt.`);
      await tx.siteReport.update({
        where: { id: report.id },
        data: decision === "APPROVED" ? {
          status: "APPROVED",
        } : {
          status: "REJECTED",
        }
      });
      break;
    }
    default: {
      throw new Error("Loại phê duyệt này chưa hỗ trợ đồng bộ tự động. Vui lòng xử lý ở phân hệ gốc.");
    }
  }
}

async function getProjectRoleMapForDecision(actor: ApprovalActor, projectId: string | null) {
  if (!projectId) return new Map<string, ProjectRole>();

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId: actor.id, isActive: true, deletedAt: null, leftAt: null },
    select: { projectId: true, role: true },
  });

  return new Map(membership ? [[membership.projectId, membership.role]] : []);
}

export async function approveApprovalRequest(id: string, note?: string) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const actor: ApprovalActor = { id: session.id, role: session.role };
  const approval = await getApprovalForDecision(id);
  const roleByProject = await getProjectRoleMapForDecision(actor, approval.projectId);
  assertCanApproveApproval(actor, approval, roleByProject);

  const decisionNote = normalizeOptionalText(note);
  const decidedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.approvalRequest.updateMany({
      where: { id, deletedAt: null, status: "PENDING" },
      data: {
        status: "APPROVED",
        decidedById: actor.id,
        decidedAt,
        decisionNote,
      },
    });
    if (updated.count !== 1) {
      throw new Error("Trạng thái yêu cầu đã thay đổi, vui lòng tải lại");
    }

    await syncSourceOnApprovalTx(tx, approval, actor.id, "APPROVED", decisionNote);

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        projectId: approval.projectId,
        action: "APPROVAL_REQUEST_APPROVED",
        entityType: "ApprovalRequest",
        entityId: id,
        beforeData: JSON.stringify({ status: approval.status }),
        afterData: JSON.stringify({ status: "APPROVED", decisionNote }),
      },
    });

    return updated;
  });

  revalidatePath(APPROVALS_PATH);
  return { ok: result.count === 1 };
}

export async function rejectApprovalRequest(id: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const actor: ApprovalActor = { id: session.id, role: session.role };
  const approval = await getApprovalForDecision(id);
  const roleByProject = await getProjectRoleMapForDecision(actor, approval.projectId);
  const normalizedReason = normalizeText(reason);
  assertCanRejectApproval(actor, approval, roleByProject, normalizedReason);

  const decidedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.approvalRequest.updateMany({
      where: { id, deletedAt: null, status: "PENDING" },
      data: {
        status: "REJECTED",
        decidedById: actor.id,
        decidedAt,
        decisionNote: normalizedReason,
      },
    });
    if (updated.count !== 1) {
      throw new Error("Trạng thái yêu cầu đã thay đổi, vui lòng tải lại");
    }

    await syncSourceOnApprovalTx(tx, approval, actor.id, "REJECTED", normalizedReason);

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        projectId: approval.projectId,
        action: "APPROVAL_REQUEST_REJECTED",
        entityType: "ApprovalRequest",
        entityId: id,
        beforeData: JSON.stringify({ status: approval.status }),
        afterData: JSON.stringify({ status: "REJECTED", reason: normalizedReason }),
      },
    });

    return updated;
  });

  revalidatePath(APPROVALS_PATH);
  return { ok: result.count === 1 };
}

export async function cancelApprovalRequest(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const actor: ApprovalActor = { id: session.id, role: session.role };
  const approval = await getApprovalForDecision(id);
  const roleByProject = await getProjectRoleMapForDecision(actor, approval.projectId);
  assertCanCancelApproval(actor, approval, roleByProject);

  const result = await prisma.approvalRequest.updateMany({
    where: { id, deletedAt: null, status: "PENDING" },
    data: {
      status: "CANCELLED",
      decidedById: actor.id,
      decidedAt: new Date(),
      decisionNote: "Yêu cầu đã được hủy",
    },
  });
  if (result.count !== 1) {
    throw new Error("Trạng thái yêu cầu đã thay đổi, vui lòng tải lại");
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      projectId: approval.projectId,
      action: "APPROVAL_REQUEST_CANCELLED",
      entityType: "ApprovalRequest",
      entityId: id,
      beforeData: JSON.stringify({ status: approval.status }),
      afterData: JSON.stringify({ status: "CANCELLED" }),
    },
  });

  revalidatePath(APPROVALS_PATH);
  return { ok: true };
}

export async function softDeleteApprovalRequest(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const actor: ApprovalActor = { id: session.id, role: session.role };
  const approval = await getApprovalForDecision(id);
  const roleByProject = await getProjectRoleMapForDecision(actor, approval.projectId);
  
  assertCanSoftDeleteApproval(actor, approval, roleByProject);

  await prisma.approvalRequest.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      projectId: approval.projectId,
      action: "APPROVAL_REQUEST_DELETED",
      entityType: "ApprovalRequest",
      entityId: id,
      beforeData: JSON.stringify({ status: approval.status, deletedAt: null }),
      afterData: JSON.stringify({ deletedAt: "set" }),
    },
  });

  revalidatePath(APPROVALS_PATH);
  return { ok: true };
}
