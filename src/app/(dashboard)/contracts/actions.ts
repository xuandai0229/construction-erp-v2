"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getContractPermissions, ContractPermissionSet } from "@/lib/contracts/contracts-permissions";
import { ContractType, ContractStatus } from "@prisma/client";

const CONTRACTS_PATH = "/contracts";

export interface ContractDto {
  id: string;
  projectId: string;
  supplierId: string | null;
  contractNo: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  value: number;
  signDate: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  
  project: { id: string; name: string; code: string };
  supplier: { id: string; name: string; code: string } | null;
  
  canUpdate: boolean;
  canDelete: boolean;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

export async function getContractsData() {
  const session = await getSession();
  if (!session) {
    return {
      contracts: [],
      projects: [],
      suppliers: [],
      globalPermissions: getContractPermissions()
    };
  }

  const globalPerms = getContractPermissions(session.role);
  
  // Lấy danh sách project memberships của user
  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.id, isActive: true, deletedAt: null, leftAt: null },
    select: { projectId: true, role: true }
  });
  
  const roleByProject = new Map(memberships.map(m => [m.projectId, m.role]));
  
  // Xác định các project user được xem
  let projectWhere: Prisma.ProjectWhereInput = { deletedAt: null };
  const hasGlobalView = session.role === "ADMIN" || session.role === "DIRECTOR" || session.role === "DEPUTY_DIRECTOR" || session.role === "MANAGER" || session.role === "ACCOUNTANT";
  
  if (!hasGlobalView) {
    projectWhere.id = { in: Array.from(roleByProject.keys()) };
  }

  // Nếu user không có quyền xem global và không thuộc project nào -> không thấy gì
  if (!hasGlobalView && roleByProject.size === 0) {
    return {
      contracts: [],
      projects: [],
      suppliers: [],
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
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' }
    })
  ]);

  const contracts = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      projectId: { in: projects.map(p => p.id) }
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      supplier: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  // Xác định quyền canCreate tổng quát cho UI (để hiển thị nút Thêm)
  let canCreateAny = globalPerms.canCreate;
  if (!canCreateAny) {
    for (const role of roleByProject.values()) {
      if (getContractPermissions(session.role, role).canCreate) {
        canCreateAny = true;
        break;
      }
    }
  }

  const dtos: ContractDto[] = contracts.map(c => {
    const projRole = roleByProject.get(c.projectId) || null;
    const perms = getContractPermissions(session.role, projRole);
    return {
      id: c.id,
      projectId: c.projectId,
      supplierId: c.supplierId,
      contractNo: c.contractNo,
      name: c.name,
      type: c.type,
      status: c.status,
      value: Number(c.value),
      signDate: c.signDate ? c.signDate.toISOString() : null,
      startDate: c.startDate ? c.startDate.toISOString() : null,
      endDate: c.endDate ? c.endDate.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      project: c.project,
      supplier: c.supplier,
      canUpdate: perms.canUpdate,
      canDelete: perms.canDelete
    };
  });

  return {
    contracts: dtos,
    projects: projects.filter(p => {
      // Chỉ trả về các project mà user có quyền tạo hợp đồng (và ACTIVE/PLANNING)
      if (p.status === "COMPLETED" || p.status === "CANCELLED") return false;
      const projRole = roleByProject.get(p.id) || null;
      return getContractPermissions(session.role, projRole).canCreate;
    }),
    suppliers,
    globalPermissions: { ...globalPerms, canCreate: canCreateAny }
  };
}

export async function createContract(data: {
  projectId: string;
  supplierId?: string;
  contractNo: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  value: number;
  signDate?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const projectId = normalizeText(data.projectId);
  if (!projectId) throw new Error("Chưa chọn công trình");

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
  });
  const perms = getContractPermissions(session.role, membership?.role);
  if (!perms.canCreate) throw new Error("Bạn không có quyền tạo hợp đồng cho công trình này");

  const contractNo = normalizeText(data.contractNo);
  const name = normalizeText(data.name);
  if (!contractNo) throw new Error("Số hợp đồng là bắt buộc");
  if (!name) throw new Error("Tên hợp đồng là bắt buộc");

  const value = Number(data.value);
  if (isNaN(value) || value < 0) throw new Error("Giá trị hợp đồng không hợp lệ");

  const supplierId = normalizeOptionalText(data.supplierId);

  try {
    await prisma.contract.create({
      data: {
        projectId,
        supplierId,
        contractNo,
        name,
        type: data.type,
        status: data.status,
        value,
        signDate: data.signDate ? new Date(data.signDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Số hợp đồng đã tồn tại trong hệ thống");
    }
    throw error;
  }

  revalidatePath(CONTRACTS_PATH);
  return { ok: true };
}

export async function updateContract(id: string, data: {
  projectId: string;
  supplierId?: string;
  contractNo: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  value: number;
  signDate?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const contract = await prisma.contract.findFirst({ where: { id, deletedAt: null } });
  if (!contract) throw new Error("Hợp đồng không tồn tại");

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: contract.projectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
  });
  const perms = getContractPermissions(session.role, membership?.role);
  if (!perms.canUpdate) throw new Error("Bạn không có quyền sửa hợp đồng này");

  const contractNo = normalizeText(data.contractNo);
  const name = normalizeText(data.name);
  if (!contractNo) throw new Error("Số hợp đồng là bắt buộc");
  if (!name) throw new Error("Tên hợp đồng là bắt buộc");

  const value = Number(data.value);
  if (isNaN(value) || value < 0) throw new Error("Giá trị hợp đồng không hợp lệ");

  const supplierId = normalizeOptionalText(data.supplierId);
  const newProjectId = normalizeText(data.projectId) || contract.projectId;

  if (newProjectId !== contract.projectId) {
    const newMembership = await prisma.projectMember.findFirst({
      where: { projectId: newProjectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
    });
    const newPerms = getContractPermissions(session.role, newMembership?.role);
    if (!newPerms.canCreate) throw new Error("Bạn không có quyền chuyển hợp đồng sang công trình này");
  }

  try {
    await prisma.contract.update({
      where: { id },
      data: {
        projectId: newProjectId,
        supplierId,
        contractNo,
        name,
        type: data.type,
        status: data.status,
        value,
        signDate: data.signDate ? new Date(data.signDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Số hợp đồng đã tồn tại trong hệ thống");
    }
    throw error;
  }

  revalidatePath(CONTRACTS_PATH);
  return { ok: true };
}

export async function deleteContract(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Vui lòng đăng nhập");

  const contract = await prisma.contract.findFirst({ 
    where: { id, deletedAt: null },
    include: { _count: { select: { paymentPlans: true } } }
  });
  if (!contract) throw new Error("Hợp đồng không tồn tại");

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: contract.projectId, userId: session.id, isActive: true, deletedAt: null, leftAt: null }
  });
  const perms = getContractPermissions(session.role, membership?.role);
  if (!perms.canDelete) throw new Error("Bạn không có quyền xóa hợp đồng này");

  if (contract._count.paymentPlans > 0) {
    throw new Error("Không thể xóa hợp đồng đã có kế hoạch thanh toán");
  }

  await prisma.contract.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  revalidatePath(CONTRACTS_PATH);
  return { ok: true };
}
