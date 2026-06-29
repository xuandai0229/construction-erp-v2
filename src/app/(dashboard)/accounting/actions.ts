"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma, PaymentRequestStatus, PaymentRequestType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAccountingPermissions } from "@/lib/accounting/accounting-permissions";

const ACCOUNTING_PATH = "/accounting";

export interface AccountingContractOptionDto {
  id: string;
  contractNo: string;
  name: string;
  projectId: string;
  value: number;
}

export interface PaymentRequestDto {
  id: string;
  requestCode: string;
  projectId: string;
  title: string;
  supplierId: string | null;
  contractId: string | null;
  type: PaymentRequestType;
  status: PaymentRequestStatus;
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  dueDate: string | null;
  notes: string | null;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
  
  project: { id: string; name: string; code: string };
  supplier: { id: string; name: string } | null;
  contract: { id: string; contractNo: string; name: string } | null;
  createdBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canMarkPaid: boolean;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

export async function getPaymentRequestsData() {
  const session = await getSession();
  if (!session) {
    return {
      paymentRequests: [],
      projects: [],
      suppliers: [],
      contracts: [],
      globalPermissions: getAccountingPermissions()
    };
  }

  const globalPerms = getAccountingPermissions(session.role);
  
  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.id, isActive: true, deletedAt: null, leftAt: null },
    select: { projectId: true, role: true }
  });
  
  const roleByProject = new Map(memberships.map(m => [m.projectId, m.role]));
  
  let projectWhere: Prisma.ProjectWhereInput = { deletedAt: null };
  const hasGlobalView = session.role === "ADMIN" || session.role === "DIRECTOR" || session.role === "DEPUTY_DIRECTOR" || session.role === "MANAGER" || session.role === "ACCOUNTANT";
  
  if (!hasGlobalView) {
    projectWhere.id = { in: Array.from(roleByProject.keys()) };
  }

  if (!hasGlobalView && roleByProject.size === 0) {
    return {
      paymentRequests: [],
      projects: [],
      suppliers: [],
      contracts: [],
      globalPermissions: globalPerms
    };
  }

  const [projects, suppliers] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, code: true, status: true },
      orderBy: { name: 'asc' }
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ]);

  const [paymentRequests, contracts] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: {
        deletedAt: null,
        projectId: { in: projects.map(p => p.id) }
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true } },
        contract: { select: { id: true, contractNo: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        projectId: { in: projects.map(p => p.id) }
      },
      select: { id: true, contractNo: true, name: true, projectId: true, value: true }
    })
  ]);

  let canCreateAny = globalPerms.canCreate;
  if (!canCreateAny) {
    for (const role of roleByProject.values()) {
      if (getAccountingPermissions(session.role, role).canCreate) {
        canCreateAny = true;
        break;
      }
    }
  }

  const dtos: PaymentRequestDto[] = paymentRequests.map(c => {
    const projRole = roleByProject.get(c.projectId) || null;
    const perms = getAccountingPermissions(session.role, projRole);
    
    // Simple CRUD - no status lock overrides
    const canUpdate = perms.canUpdate || c.createdById === session.id;
    const canDelete = perms.canDelete || c.createdById === session.id;

    return {
      id: c.id,
      requestCode: c.requestCode,
      projectId: c.projectId,
      title: c.title,
      supplierId: c.supplierId,
      contractId: c.contractId,
      type: c.type,
      status: c.status,
      subTotal: Number(c.subTotal),
      vatAmount: Number(c.vatAmount),
      totalAmount: Number(c.totalAmount),
      dueDate: c.dueDate ? c.dueDate.toISOString() : null,
      notes: c.notes,
      createdById: c.createdById,
      approvedById: c.approvedById,
      approvedAt: c.approvedAt ? c.approvedAt.toISOString() : null,
      paidAt: c.paidAt ? c.paidAt.toISOString() : null,
      rejectedReason: c.rejectedReason,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      project: c.project,
      supplier: c.supplier,
      contract: c.contract,
      createdBy: c.createdBy,
      approvedBy: c.approvedBy,
      canUpdate,
      canDelete,
      canApprove: false,
      canMarkPaid: false
    };
  });

  const contractDtos: AccountingContractOptionDto[] = contracts.map(c => ({
    id: c.id,
    contractNo: c.contractNo,
    name: c.name,
    projectId: c.projectId,
    value: Number(c.value)
  }));

  return {
    paymentRequests: dtos,
    projects: projects.filter(p => {
      if (p.status === "COMPLETED" || p.status === "CANCELLED") return false;
      const projRole = roleByProject.get(p.id) || null;
      return getAccountingPermissions(session.role, projRole).canCreate;
    }),
    suppliers,
    contracts: contractDtos,
    globalPermissions: { ...globalPerms, canCreate: canCreateAny }
  };
}
const EDITABLE_PAYMENT_STATUSES = ["DRAFT", "REJECTED"] as const;

function assertPaymentEditable(status: string) {
  if (!EDITABLE_PAYMENT_STATUSES.includes(status as any)) {
    throw new Error("Chỉ được sửa phiếu thanh toán ở trạng thái Nháp hoặc Bị từ chối.");
  }
}

function assertPaymentDeletable(status: string) {
  if (!EDITABLE_PAYMENT_STATUSES.includes(status as any)) {
    throw new Error("Chỉ được xóa phiếu thanh toán ở trạng thái Nháp hoặc Bị từ chối.");
  }
}

async function assertContractPaymentLimit(params: {
  contractId: string | null | undefined;
  totalAmount: number;
  excludePaymentRequestId?: string;
}) {
  if (!params.contractId) return;

  const contract = await prisma.contract.findUnique({ where: { id: params.contractId } });
  if (!contract || contract.deletedAt) {
    throw new Error("Hợp đồng không tồn tại hoặc đã bị xóa.");
  }

  const validStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "PAID"];
  const otherPayments = await prisma.paymentRequest.findMany({
    where: {
      contractId: params.contractId,
      deletedAt: null,
      status: { in: validStatuses as PaymentRequestStatus[] },
      id: params.excludePaymentRequestId ? { not: params.excludePaymentRequestId } : undefined
    },
    select: { totalAmount: true }
  });

  const usedAmount = otherPayments.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const nextTotal = usedAmount + params.totalAmount;

  if (nextTotal > Number(contract.value)) {
    throw new Error("Tổng đề nghị thanh toán vượt giá trị hợp đồng.");
  }
}

export async function createPaymentRequest(data: {
  projectId: string;
  title: string;
  supplierId?: string;
  contractId?: string;
  type: PaymentRequestType;
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  dueDate?: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const projectId = normalizeText(data.projectId);
  if (!projectId) throw new Error("Chưa chọn công trình");

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
  });
  const perms = getAccountingPermissions(session.role, membership?.role);
  if (!perms.canCreate) throw new Error("Bạn không có quyền tạo hồ sơ thanh toán");

  const title = normalizeText(data.title);
  if (!title) throw new Error("Tiêu đề là bắt buộc");

  const totalAmount = Number(data.totalAmount);
  if (isNaN(totalAmount) || totalAmount <= 0) throw new Error("Tổng tiền phải lớn hơn 0");

  const contractId = normalizeOptionalText(data.contractId);
  if (contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new Error("Hợp đồng không tồn tại");
    if (contract.projectId !== projectId) throw new Error("Hợp đồng không thuộc công trình này");

    await assertContractPaymentLimit({ contractId, totalAmount });
  }

  let requestCode = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `TT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const existing = await prisma.paymentRequest.findUnique({ where: { requestCode: code } });
    if (!existing) {
      requestCode = code;
      break;
    }
  }
  if (!requestCode) requestCode = `TT-${Date.now()}`;

  try {
    await prisma.paymentRequest.create({
      data: {
        requestCode,
        projectId,
        title,
        supplierId: normalizeOptionalText(data.supplierId),
        contractId: normalizeOptionalText(data.contractId),
        type: data.type,
        status: "DRAFT", // default to DRAFT, UI won't care right now
        subTotal: Number(data.subTotal) || 0,
        vatAmount: Number(data.vatAmount) || 0,
        totalAmount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: normalizeOptionalText(data.notes),
        createdById: session.id
      }
    });
  } catch (error) {
    throw new Error("Lỗi khi tạo hồ sơ thanh toán");
  }

  revalidatePath(ACCOUNTING_PATH);
  return { ok: true };
}

export async function updatePaymentRequest(id: string, data: {
  title: string;
  supplierId?: string;
  contractId?: string;
  type: PaymentRequestType;
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  dueDate?: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const pr = await prisma.paymentRequest.findFirst({ where: { id, deletedAt: null } });
  if (!pr) throw new Error("Hồ sơ thanh toán không tồn tại");

  if (!pr) throw new Error("Hồ sơ thanh toán không tồn tại");

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: pr.projectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
  });
  const perms = getAccountingPermissions(session.role, membership?.role);
  
  if (!perms.canUpdate && pr.createdById !== session.id) {
    throw new Error("Bạn không có quyền sửa hồ sơ này");
  }

  assertPaymentEditable(pr.status);

  const title = normalizeText(data.title);
  if (!title) throw new Error("Tiêu đề là bắt buộc");

  const totalAmount = Number(data.totalAmount);
  if (isNaN(totalAmount) || totalAmount <= 0) throw new Error("Tổng tiền phải lớn hơn 0");

  const contractId = normalizeOptionalText(data.contractId);
  if (contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new Error("Hợp đồng không tồn tại");
    if (contract.projectId !== pr.projectId) throw new Error("Hợp đồng không thuộc công trình này");

    await assertContractPaymentLimit({ contractId, totalAmount, excludePaymentRequestId: id });
  }

  await prisma.paymentRequest.update({
    where: { id },
    data: {
      title,
      supplierId: normalizeOptionalText(data.supplierId),
      contractId: normalizeOptionalText(data.contractId),
      type: data.type,
      subTotal: Number(data.subTotal) || 0,
      vatAmount: Number(data.vatAmount) || 0,
      totalAmount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: normalizeOptionalText(data.notes)
    }
  });

  revalidatePath(ACCOUNTING_PATH);
  return { ok: true };
}

export async function changePaymentStatus(id: string, action: "APPROVE" | "REJECT" | "MARK_PAID" | "CANCEL" | "SUBMIT", reason?: string) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const pr = await prisma.paymentRequest.findFirst({ where: { id, deletedAt: null } });
  if (!pr) throw new Error("Hồ sơ không tồn tại");

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: pr.projectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
  });
  const perms = getAccountingPermissions(session.role, membership?.role);

  const updateData: any = {};

  switch (action) {
    case "SUBMIT":
      if (pr.status !== "DRAFT" && pr.status !== "REJECTED") {
        throw new Error("Chỉ có thể gửi duyệt hồ sơ Nháp hoặc Bị từ chối");
      }
      if (pr.createdById !== session.id && session.role !== "ADMIN") {
        throw new Error("Chỉ người tạo hồ sơ hoặc Quản trị viên mới có quyền gửi duyệt");
      }
      updateData.status = "SUBMITTED";
      break;
    case "APPROVE":
      if (!perms.canApprove) throw new Error("Bạn không có quyền duyệt");
      if (pr.createdById === session.id && session.role !== "ADMIN") throw new Error("Bạn không thể tự duyệt hồ sơ của chính mình");
      if (pr.status !== "SUBMITTED") throw new Error("Chỉ có thể duyệt hồ sơ chờ duyệt");
      updateData.status = "APPROVED";
      updateData.approvedById = session.id;
      updateData.approvedAt = new Date();
      break;
    case "REJECT":
      if (!perms.canApprove) throw new Error("Bạn không có quyền từ chối");
      if (pr.createdById === session.id && session.role !== "ADMIN") throw new Error("Bạn không thể tự từ chối hồ sơ của chính mình");
      if (pr.status !== "SUBMITTED") throw new Error("Chỉ có thể từ chối hồ sơ chờ duyệt");
      if (!reason || !reason.trim()) throw new Error("Lý do từ chối là bắt buộc");
      updateData.status = "REJECTED";
      updateData.rejectedReason = normalizeOptionalText(reason);
      break;
    case "MARK_PAID":
      if (!perms.canMarkPaid) throw new Error("Bạn không có quyền thanh toán");
      if (pr.status !== "APPROVED") throw new Error("Chỉ có thể thanh toán hồ sơ đã duyệt");
      updateData.status = "PAID";
      updateData.paidAt = new Date();
      break;
    case "CANCEL":
      if (!perms.canDelete && pr.createdById !== session.id) {
        throw new Error("Bạn không có quyền hủy hồ sơ này");
      }
      if (pr.status !== "DRAFT" && pr.status !== "REJECTED" && pr.status !== "SUBMITTED") {
        throw new Error("Chỉ có thể hủy hồ sơ ở trạng thái Nháp, Chờ duyệt hoặc Bị từ chối");
      }
      if (pr.status === "SUBMITTED" && pr.createdById !== session.id && session.role !== "ADMIN") {
        throw new Error("Chỉ người tạo hồ sơ hoặc Quản trị viên mới được hủy hồ sơ đang chờ duyệt");
      }
      updateData.status = "CANCELLED";
      break;
  }

  await prisma.paymentRequest.update({
    where: { id },
    data: updateData
  });

  revalidatePath(ACCOUNTING_PATH);
  return { ok: true };
}

export async function deletePaymentRequest(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const pr = await prisma.paymentRequest.findFirst({ where: { id, deletedAt: null } });
  if (!pr) throw new Error("Hồ sơ không tồn tại");

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: pr.projectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
  });
  const perms = getAccountingPermissions(session.role, membership?.role);

  if (!perms.canDelete && pr.createdById !== session.id) {
    throw new Error("Bạn không có quyền xóa hồ sơ này");
  }

  assertPaymentDeletable(pr.status);

  await prisma.paymentRequest.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  revalidatePath(ACCOUNTING_PATH);
  return { ok: true };
}
