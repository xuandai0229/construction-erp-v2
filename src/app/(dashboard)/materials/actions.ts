"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { applyMaterialMovement, parseNonNegativeQuantity, parsePositiveQuantity } from "@/lib/materials/ledger";
import { MaterialMovementType, MaterialProposalStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getMaterialPermissions, MaterialPermissionSet } from "@/lib/materials/materials-permissions";
import { canViewAllProjects } from "@/lib/rbac";
import { writeSecurityAuditEvent } from "@/lib/audit";

const MATERIALS_PATH = "/materials";

function handlePrismaError(error: unknown, fallbackMessage: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    console.error("[Prisma Error]", error);
    throw new Error(fallbackMessage);
  }
  throw error;
}

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export interface MaterialItemDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  manufacturer: string | null;
  origin: string | null;
  description: string | null;
  isActive: boolean;
  hasMovement: boolean;
  createdAt: string;
  updatedAt: string;
  approvedProposalQuantity?: number;
  importedFromProposalQuantity?: number;
  pendingProposalQuantity?: number;
}

export interface ProjectStockDto {
  id: string;
  projectId: string;
  materialItemId: string;
  stock: number;
  minStockLevel: number;
  lastUpdated: string;
  materialItem: MaterialItemDto;
}

export interface MaterialMovementDto {
  id: string;
  projectId: string;
  materialItemId: string;
  type: MaterialMovementType;
  quantity: number;
  unitPrice: number | null;
  movementDate: string;
  notes: string | null;
  createdAt: string;
  materialItem: MaterialItemDto;
  materialRequestId?: string | null;
  materialRequest?: {
    requestNo: string;
    requestedBy?: { name: string | null };
  } | null;
  /** Present for company-scope queries.  Never infer a project label in the UI. */
  project?: {
    code: string;
    name: string;
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : undefined;
}

function normalizeMaterialCode(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function codeBaseFromName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 18);

  return slug || "VAT-TU";
}

async function buildUniqueMaterialCode(name: string, projectId: string) {
  const base = `VT-${codeBaseFromName(name)}`;

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? base : `${base}-${String(index + 1).padStart(2, "0")}`;
    const existing = await prisma.materialItem.findUnique({
      where: { projectId_code: { projectId, code: candidate } },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function toMaterialItemDto(item: {
  id: string;
  code: string;
  name: string;
  unit: string;
  manufacturer: string | null;
  origin: string | null;
  description: string | null;
  isActive: boolean;
  _count?: { movements: number };
  createdAt: Date;
  updatedAt: Date;
}): MaterialItemDto {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    manufacturer: item.manufacturer,
    origin: item.origin,
    description: item.description,
    isActive: item.isActive,
    hasMovement: item._count ? item._count.movements > 0 : false,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    approvedProposalQuantity: Number((item as any).approvedProposalQuantity || 0),
    importedFromProposalQuantity: Number((item as any).importedFromProposalQuantity || 0),
    pendingProposalQuantity: Number((item as any).pendingProposalQuantity || 0),
  };
}

function toStockDto(stock: {
  id: string;
  projectId: string;
  materialItemId: string;
  stock: Prisma.Decimal;
  minStockLevel: Prisma.Decimal;
  lastUpdated: Date;
  materialItem: Parameters<typeof toMaterialItemDto>[0];
}): ProjectStockDto {
  return {
    id: stock.id,
    projectId: stock.projectId,
    materialItemId: stock.materialItemId,
    stock: Number(stock.stock),
    minStockLevel: Number(stock.minStockLevel),
    lastUpdated: stock.lastUpdated.toISOString(),
    materialItem: toMaterialItemDto(stock.materialItem),
  };
}

function toMovementDto(movement: {
  id: string;
  projectId: string;
  materialItemId: string;
  type: MaterialMovementType;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal | null;
  movementDate: Date;
  notes: string | null;
  createdAt: Date;
  materialItem: Parameters<typeof toMaterialItemDto>[0];
  materialRequestId?: string | null;
  materialRequest?: any;
  project?: { code: string; name: string };
}): MaterialMovementDto {
  return {
    id: movement.id,
    projectId: movement.projectId,
    materialItemId: movement.materialItemId,
    type: movement.type,
    quantity: Number(movement.quantity),
    unitPrice: movement.unitPrice === null ? null : Number(movement.unitPrice),
    movementDate: movement.movementDate.toISOString(),
    notes: movement.notes,
    createdAt: movement.createdAt.toISOString(),
    materialItem: toMaterialItemDto(movement.materialItem),
    materialRequestId: movement.materialRequestId || null,
    materialRequest: movement.materialRequest ? {
      requestNo: movement.materialRequest.requestNo,
      requestedBy: movement.materialRequest.requestedBy
    } : null,
    project: movement.project,
  };
}

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Bạn cần đăng nhập để thao tác vật tư");
  return session;
}

export async function requireProjectPermissions(session: Session, projectId: string): Promise<MaterialPermissionSet> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });

  if (!project) throw new Error("Không tìm thấy công trình");

  let projectRole = null;
  if (!canViewAllProjects(session)) {
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: session.id,
        isActive: true,
        deletedAt: null,
        leftAt: null,
      },
      select: { role: true },
    });

    if (!membership) throw new Error("Bạn không có quyền thao tác công trình này");
    projectRole = membership.role;
  }

  return getMaterialPermissions(session.role, projectRole);
}

async function assertPermission(
  session: Session,
  projectId: string,
  permissions: MaterialPermissionSet,
  action: keyof MaterialPermissionSet,
) {
  if (!permissions[action]) {
    await writeSecurityAuditEvent({
      eventType: "SOURCE_MUTATION_DENIED",
      actorId: session.id,
      role: session.role,
      action: `materials.${action}`,
      resourceType: "Material",
      resourceId: projectId,
      projectId,
      reasonCode: "MATERIAL_PERMISSION_DENIED",
    });
    throw new Error("Bạn không có quyền thực hiện thao tác vật tư này.");
  }
}

// ========================
// Fetch Projects
// ========================
export async function getActiveProjects() {
  const session = await getSession();
  if (!session) return [];

  const whereClause: Prisma.ProjectWhereInput =
    canViewAllProjects(session)
      ? { status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] }, deletedAt: null }
      : {
          status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] },
          deletedAt: null,
          members: {
            some: {
              userId: session.id,
              isActive: true,
              deletedAt: null,
              leftAt: null,
            },
          },
        };

  return prisma.project.findMany({
    where: whereClause,
    select: { id: true, name: true, code: true, status: true, investor: true, location: true, sourceMetadata: true },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });
}

// ========================
// Fetch Material Catalog
// ========================
export async function getMaterialItems(projectId: string): Promise<MaterialItemDto[]> {
  const session = await getSession();
  if (!session) return [];

  if (!projectId) return [];
  const perms = await requireProjectPermissions(session, projectId);
  if (!perms.canView) return [];

  const items = await prisma.materialItem.findMany({
    where: { projectId },
    include: {
      _count: { select: { movements: true } },
    },
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });

  return items.map(item => {
    return toMaterialItemDto({
      ...item,
      approvedProposalQuantity: 0,
      importedFromProposalQuantity: 0,
      pendingProposalQuantity: 0
    } as any);
  });
}

// ========================
// Fetch Project Stocks
// ========================
export async function getProjectStocks(projectId: string): Promise<ProjectStockDto[]> {
  const session = await getSession();
  if (!session) return [];

  const perms = await requireProjectPermissions(session, projectId);
  if (!perms.canView) return [];

  const stocks = await prisma.projectMaterialStock.findMany({
    where: { projectId },
    include: {
      materialItem: true,
    },
    orderBy: {
      materialItem: { name: "asc" },
    },
  });

  return stocks.map(toStockDto);
}

// ========================
// Manage Material Item
// ========================
export async function createMaterialItem(data: {
  projectId: string;
  code?: string;
  name: string;
  unit: string;
  manufacturer?: string;
  origin?: string;
  description?: string;
  minStockLevel?: number;
  initialStock?: number;
  initialStockDate?: Date;
  initialStockNotes?: string;
}) {
  const session = await requireSession();

  const name = normalizeText(data.name);
  const unit = normalizeText(data.unit);
  const projectId = normalizeText(data.projectId);
  const minStockLevel = parseNonNegativeQuantity(data.minStockLevel ?? 0, "Tồn tối thiểu");

  if (!name) throw new Error("Tên vật tư là bắt buộc");
  if (!unit) throw new Error("Đơn vị tính là bắt buộc");
  if (!projectId) throw new Error("Vui lòng chọn công trình");

  const perms = await requireProjectPermissions(session, projectId);
  await assertPermission(session, projectId, perms, "canCreate");

  if (data.initialStock && data.initialStock > 0) {
    await assertPermission(session, projectId, perms, "canImport");
  }

  const requestedCode = normalizeMaterialCode(data.code);
  const code = requestedCode || (await buildUniqueMaterialCode(name, projectId));

  try {
    await prisma.$transaction(async (tx) => {
      const material = await tx.materialItem.create({
        data: {
          projectId,
          code,
          name,
          unit,
          manufacturer: normalizeOptionalText(data.manufacturer),
          origin: normalizeOptionalText(data.origin),
          description: normalizeOptionalText(data.description),
        },
        select: { id: true },
      });

      if (projectId) {
        await tx.projectMaterialStock.upsert({
          where: {
            projectId_materialItemId: {
              projectId,
              materialItemId: material.id,
            },
          },
          update: {
            minStockLevel,
            lastUpdated: new Date(),
          },
          create: {
            projectId,
            materialItemId: material.id,
            stock: 0,
            minStockLevel,
          },
        });

        if (data.initialStock && data.initialStock > 0 && data.initialStockDate) {
          await applyMaterialMovement(tx, {
            projectId,
            materialItemId: material.id,
            type: "IMPORT",
            quantity: data.initialStock,
            movementDate: data.initialStockDate,
            notes: normalizeOptionalText(data.initialStockNotes) || "Nhập tồn kho ban đầu",
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Mã vật tư đã tồn tại");
    }
    handlePrismaError(error, "Không thể tạo vật tư. Vui lòng kiểm tra lại dữ liệu.");
  }

  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

export async function updateMaterialItem(id: string, data: { code?: string; name: string; unit: string; manufacturer?: string; origin?: string; description?: string; minStockLevel?: number }) {
  const session = await requireSession();

  const name = normalizeText(data.name);
  const unit = normalizeText(data.unit);
  if (!name) throw new Error("Tên vật tư là bắt buộc");
  if (!unit) throw new Error("Đơn vị tính là bắt buộc");

  const material = await prisma.materialItem.findUnique({
    where: { id },
    select: { id: true, projectId: true, unit: true, code: true },
  });
  if (!material) throw new Error("Vật tư không tồn tại");
  if (!material.projectId) throw new Error("Vật tư không thuộc công trình nào");

  const perms = await requireProjectPermissions(session, material.projectId);
  await assertPermission(session, material.projectId, perms, "canRestore");

  const requestedCode = data.code ? normalizeMaterialCode(data.code) : undefined;

  // Block code modification if material is already used in transactions
  if (requestedCode && requestedCode !== material.code) {
    const movementsCount = await prisma.materialMovement.count({
      where: { materialItemId: id, projectId: material.projectId },
    });

    if (movementsCount > 0) {
      throw new Error("Không thể đổi mã vật tư vì vật tư này đã phát sinh giao dịch nhập/xuất.");
    }
  }

  // Cho phép sửa các trường khác

  try {
    await prisma.$transaction(async (tx) => {
      if (requestedCode) {
        // Check unique code within project
        const existing = await tx.materialItem.findUnique({
          where: { projectId_code: { projectId: material.projectId, code: requestedCode } },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          throw new Error("Mã vật tư đã tồn tại trong công trình này");
        }
      }

      await tx.materialItem.update({
        where: { id },
        data: {
          code: requestedCode,
          name,
          unit,
          manufacturer: normalizeOptionalText(data.manufacturer),
          origin: normalizeOptionalText(data.origin),
          description: normalizeOptionalText(data.description),
        },
      });

      if (data.minStockLevel !== undefined) {
        const minStockLevel = parseNonNegativeQuantity(data.minStockLevel, "Tồn tối thiểu");
        await tx.projectMaterialStock.upsert({
          where: {
            projectId_materialItemId: {
              projectId: material.projectId,
              materialItemId: id,
            },
          },
          update: {
            minStockLevel,
            lastUpdated: new Date(),
          },
          create: {
            projectId: material.projectId,
            materialItemId: id,
            stock: 0,
            minStockLevel,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Mã vật tư đã tồn tại");
    }
    handlePrismaError(error, "Không thể cập nhật vật tư. Vui lòng kiểm tra lại dữ liệu hợp lệ.");
  }
  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

export async function deleteMaterialItem(id: string) {
  const session = await requireSession();

  const material = await prisma.materialItem.findUnique({
    where: { id },
    select: { id: true, projectId: true, code: true },
  });
  if (!material) throw new Error("Vật tư không tồn tại");
  if (!material.projectId) throw new Error("Vật tư không thuộc công trình nào");

  const perms = await requireProjectPermissions(session, material.projectId);
  await assertPermission(session, material.projectId, perms, "canDelete");

  const movementsCount = await prisma.materialMovement.count({
    where: { materialItemId: id, projectId: material.projectId },
  });

  const stockInfo = await prisma.projectMaterialStock.findUnique({
    where: { projectId_materialItemId: { projectId: material.projectId, materialItemId: id } },
  });

  if (movementsCount > 0 || (stockInfo && Number(stockInfo.stock) > 0)) {
    // Soft delete/archive
    await prisma.materialItem.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    // Hard delete if completely unused
    await prisma.$transaction([
      prisma.projectMaterialStock.deleteMany({
        where: { materialItemId: id, projectId: material.projectId },
      }),
      prisma.materialItem.delete({
        where: { id },
      }),
    ]);
  }

  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

export async function restoreMaterialItem(id: string) {
  const session = await requireSession();

  const material = await prisma.materialItem.findUnique({
    where: { id },
    select: { id: true, projectId: true, isActive: true },
  });
  if (!material) throw new Error("Vật tư không tồn tại");
  if (!material.projectId) throw new Error("Vật tư không thuộc công trình nào");

  const perms = await requireProjectPermissions(session, material.projectId);
  await assertPermission(session, material.projectId, perms, "canUpdate");

  if (!material.isActive) {
    await prisma.materialItem.update({
      where: { id },
      data: { isActive: true },
    });
  }

  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}


// ========================
// Manage Stock Settings
// ========================
export async function setProjectMinStock(projectId: string, materialItemId: string, minStockLevel: number) {
  const session = await requireSession();
  const perms = await requireProjectPermissions(session, projectId);
  await assertPermission(session, projectId, perms, "canUpdate");

  const parsedMinStock = parseNonNegativeQuantity(minStockLevel, "Tồn tối thiểu");

  const material = await prisma.materialItem.findUnique({
    where: { id: materialItemId },
    select: { id: true, projectId: true },
  });
  if (!material) throw new Error("Vật tư không tồn tại");
  if (material.projectId !== projectId) throw new Error("Vật tư không thuộc công trình này");

  await prisma.projectMaterialStock.upsert({
    where: {
      projectId_materialItemId: { projectId, materialItemId },
    },
    update: {
      minStockLevel: parsedMinStock,
      lastUpdated: new Date(),
    },
    create: {
      projectId,
      materialItemId,
      stock: 0,
      minStockLevel: parsedMinStock,
    },
  });
  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

// ========================
// Material Transactions
// ========================
export async function createMaterialTransaction(data: {
  projectId: string;
  materialItemId: string;
  type: "IMPORT" | "EXPORT";
  quantity: number;
  unitPrice?: number;
  movementDate: Date;
  notes?: string;
  materialRequestId?: string;
  materialRequestItemId?: string;
}) {
  const session = await requireSession();
  const projectId = normalizeText(data.projectId);
  const materialItemId = normalizeText(data.materialItemId);
  const type = data.type;
  const quantity = parsePositiveQuantity(data.quantity);
  const movementDate = new Date(data.movementDate);
  const unitPrice = data.unitPrice === undefined ? undefined : parseNonNegativeQuantity(data.unitPrice, "Đơn giá");

  if (!projectId) throw new Error("Vui lòng chọn công trình");
  if (!materialItemId) throw new Error("Vui lòng chọn vật tư");
  if (!["IMPORT", "EXPORT"].includes(type)) throw new Error("Loại giao dịch không hợp lệ");
  if (Number.isNaN(movementDate.getTime())) throw new Error("Ngày giao dịch không hợp lệ");

  const perms = await requireProjectPermissions(session, projectId);
  await assertPermission(session, projectId, perms, "canViewTransactions");
  if (type === "IMPORT") await assertPermission(session, projectId, perms, "canImport");
  if (type === "EXPORT") await assertPermission(session, projectId, perms, "canExport");

  if (data.materialRequestId && !data.materialRequestItemId) {
    throw new Error("Vui lòng chọn dòng vật tư cần xuất kho.");
  }

  try {
    await prisma.$transaction((tx) =>
      applyMaterialMovement(tx, {
        projectId,
        materialItemId,
        type,
        quantity,
        unitPrice,
        movementDate,
        notes: normalizeOptionalText(data.notes),
        materialRequestId: normalizeOptionalText(data.materialRequestId),
        materialRequestItemId: normalizeOptionalText(data.materialRequestItemId),
      })
    );
  } catch (error: any) {
    if (error?.message?.includes("Invalid `tx.materialMovement.create()`") || error?.message?.includes("Unknown argument")) {
      console.error("[Ledger Error]", error);
      throw new Error("Không thể tạo giao dịch. Vui lòng kiểm tra lại số lượng hoặc dữ liệu.");
    }
    handlePrismaError(error, "Không thể tạo giao dịch. Vui lòng kiểm tra lại số lượng hoặc dữ liệu.");
  }

  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

export async function getRecentTransactions(projectId: string): Promise<MaterialMovementDto[]> {
  const session = await getSession();
  if (!session) return [];

  const perms = await requireProjectPermissions(session, projectId);
  if (!perms.canViewTransactions) return [];

  const movements = await prisma.materialMovement.findMany({
    where: { projectId },
    include: {
      materialItem: true,
    },
    orderBy: { movementDate: "desc" },
  });

  return movements.map(toMovementDto);
}

// ==========================================
// PORTFOLIO / COMPANY SCOPE ACTIONS
// ==========================================

export interface PortfolioCatalogItemDto {
  identity: string;
  code: string;
  name: string;
  unit: string;
  manufacturer: string | null;
  origin: string | null;
  projectCount: number;
  totalStock: number;
  lowStockProjectCount: number;
  lastUpdated: string;
  projectsBreakdown: {
    materialItemId: string;
    projectId: string;
    projectCode: string;
    projectName: string;
    stock: number;
    minStockLevel: number;
    isActive: boolean;
  }[];
}

export interface PortfolioStockItemDto {
  identity: string;
  code: string;
  name: string;
  unit: string;
  manufacturer: string | null;
  origin: string | null;
  totalStock: number;
  projectCount: number;
  lowStockProjectCount: number;
  inStockProjectCount: number;
  warning: boolean;
  lastUpdated: string;
  projectsBreakdown: {
    projectId: string;
    projectCode: string;
    projectName: string;
    stock: number;
    minStockLevel: number;
    lastUpdated: string;
  }[];
}

export interface PortfolioOverviewDto {
  totalProjects: number;
  projectsWithMaterialData: number;
  totalMaterialItems: number;
  lowStockProjectsCount: number;
  totalProposalsCount: number;
  recentMovementsCount: number;
  lowStockItemsCount: number;
  attentionProjects: {
    projectId: string;
    projectCode: string;
    projectName: string;
    lowStockCount: number;
    pendingProposalsCount: number;
  }[];
  recentTransactions: MaterialMovementDto[];
  recentProposals: any[];
}

export async function getPortfolioOverview(permittedProjectIds: string[]): Promise<PortfolioOverviewDto> {
  const session = await getSession();
  if (!session || !canViewAllProjects(session) || permittedProjectIds.length === 0) {
    return {
      totalProjects: 0,
      projectsWithMaterialData: 0,
      totalMaterialItems: 0,
      lowStockProjectsCount: 0,
      totalProposalsCount: 0,
      recentMovementsCount: 0,
      lowStockItemsCount: 0,
      attentionProjects: [],
      recentTransactions: [],
      recentProposals: [],
    };
  }

  // 1. Projects count
  const totalProjects = permittedProjectIds.length;

  // 2. Distinct projects with material items
  const projectsWithMaterials = await prisma.materialItem.groupBy({
    by: ["projectId"],
    where: { projectId: { in: permittedProjectIds } },
  });
  const projectsWithMaterialData = projectsWithMaterials.length;

  // MaterialItem belongs to a project. Count real records rather than implying
  // a global material master by deduplicating only on the local code.
  const totalMaterialItems = await prisma.materialItem.count({
    where: { projectId: { in: permittedProjectIds } },
  });

  // 4. Stocks & low stock calculations
  const stocks = await prisma.projectMaterialStock.findMany({
    where: { projectId: { in: permittedProjectIds } },
    include: {
      project: { select: { id: true, code: true, name: true } },
    },
  });

  let lowStockItemsCount = 0;
  const lowStockProjectIds = new Set<string>();
  const lowStockCountByProject: Record<string, number> = {};

  stocks.forEach((s) => {
    const stockVal = Number(s.stock);
    const minVal = Number(s.minStockLevel);
    if ((minVal > 0 && stockVal <= minVal) || stockVal < 0) {
      lowStockItemsCount += 1;
      lowStockProjectIds.add(s.projectId);
      lowStockCountByProject[s.projectId] = (lowStockCountByProject[s.projectId] || 0) + 1;
    }
  });

  // 5. Material Proposals count & pending per project
  const proposals = await prisma.materialProposal.findMany({
    // The proposal list deliberately excludes cancelled documents. Keep this
    // KPI on the identical presentation dataset so the portfolio total can
    // always be reconciled with project rows.
    where: {
      projectId: { in: permittedProjectIds },
      status: { not: MaterialProposalStatus.CANCELLED },
    },
    select: { id: true, projectId: true, status: true, requiredDeliveryDate: true },
  });
  const totalProposalsCount = proposals.length;
  const pendingProposalCountByProject: Record<string, number> = {};
  const today = new Date();

  proposals.forEach((p) => {
    if (
      p.status === MaterialProposalStatus.SUBMITTED ||
      p.status === MaterialProposalStatus.DRAFT ||
      p.status === MaterialProposalStatus.REVISION_REQUESTED ||
      (p.requiredDeliveryDate !== null && p.requiredDeliveryDate < today && p.status !== MaterialProposalStatus.APPROVED)
    ) {
      pendingProposalCountByProject[p.projectId] = (pendingProposalCountByProject[p.projectId] || 0) + 1;
    }
  });

  // 6. Recent Movements count
  const recentMovementsCount = await prisma.materialMovement.count({
    where: { projectId: { in: permittedProjectIds } },
  });

  // 7. Attention Projects
  const attentionProjectIds = Array.from(
    new Set([...Object.keys(lowStockCountByProject), ...Object.keys(pendingProposalCountByProject)])
  );

  const attentionProjectsData = await prisma.project.findMany({
    where: { id: { in: attentionProjectIds } },
    select: { id: true, code: true, name: true },
  });

  const attentionProjects = attentionProjectsData.map((p) => ({
    projectId: p.id,
    projectCode: p.code,
    projectName: p.name,
    lowStockCount: lowStockCountByProject[p.id] || 0,
    pendingProposalsCount: pendingProposalCountByProject[p.id] || 0,
  }));

  // 8. Recent transactions cross-project
  const rawMovements = await prisma.materialMovement.findMany({
    where: { projectId: { in: permittedProjectIds } },
    include: { materialItem: true, project: { select: { code: true, name: true } } },
    orderBy: { movementDate: "desc" },
    take: 10,
  });
  const recentTransactions = rawMovements.map(toMovementDto);

  // 9. Recent proposals cross-project
  const { listMaterialProposalsForProjects } = await import("@/lib/material-proposals/actions");
  const recentProposals = await listMaterialProposalsForProjects(permittedProjectIds);

  return {
    totalProjects,
    projectsWithMaterialData,
    totalMaterialItems,
    lowStockProjectsCount: lowStockProjectIds.size,
    totalProposalsCount,
    recentMovementsCount,
    lowStockItemsCount,
    attentionProjects,
    recentTransactions,
    recentProposals: recentProposals.slice(0, 10),
  };
}

export async function getPortfolioCatalog(permittedProjectIds: string[]): Promise<PortfolioCatalogItemDto[]> {
  const session = await getSession();
  if (!session || !canViewAllProjects(session) || permittedProjectIds.length === 0) return [];

  const items = await prisma.materialItem.findMany({
    where: { projectId: { in: permittedProjectIds } },
    include: {
      project: { select: { id: true, code: true, name: true } },
      projectStocks: { select: { stock: true, minStockLevel: true, lastUpdated: true } },
    },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  });

  // A local code is only unique inside a project. This is a presentation-only
  // grouping, never a global material master. We only combine rows whose
  // current metadata agrees; the individual MaterialItem ids stay available.
  const grouped = new Map<string, PortfolioCatalogItemDto>();

  items.forEach((item) => {
    const key = `${item.name.trim().toLocaleLowerCase("vi")}::${item.unit.trim().toLocaleLowerCase("vi")}::${(item.manufacturer || "").trim().toLocaleLowerCase("vi")}::${(item.origin || "").trim().toLocaleLowerCase("vi")}`;
    const stockInfo = item.projectStocks[0];
    const stockVal = stockInfo ? Number(stockInfo.stock) : 0;
    const minVal = stockInfo ? Number(stockInfo.minStockLevel) : 0;
    const isLow = (minVal > 0 && stockVal < minVal) || stockVal < 0;

    if (!grouped.has(key)) {
      grouped.set(key, {
        identity: key,
        code: item.code,
        name: item.name,
        unit: item.unit,
        manufacturer: item.manufacturer || null,
        origin: item.origin || null,
        projectCount: 1,
        totalStock: stockVal,
        lowStockProjectCount: isLow ? 1 : 0,
        lastUpdated: item.updatedAt.toISOString(),
        projectsBreakdown: [
          {
            materialItemId: item.id,
            projectId: item.project.id,
            projectCode: item.project.code,
            projectName: item.project.name,
            stock: stockVal,
            minStockLevel: minVal,
            isActive: item.isActive,
          },
        ],
      });
    } else {
      const existing = grouped.get(key)!;
      existing.projectCount += 1;
      existing.totalStock += stockVal;
      if (isLow) existing.lowStockProjectCount += 1;
      if (new Date(item.updatedAt) > new Date(existing.lastUpdated)) {
        existing.lastUpdated = item.updatedAt.toISOString();
      }
      existing.projectsBreakdown.push({
        materialItemId: item.id,
        projectId: item.project.id,
        projectCode: item.project.code,
        projectName: item.project.name,
        stock: stockVal,
        minStockLevel: minVal,
        isActive: item.isActive,
      });
    }
  });

  return Array.from(grouped.values());
}

export async function getPortfolioStocks(permittedProjectIds: string[]): Promise<PortfolioStockItemDto[]> {
  const session = await getSession();
  if (!session || !canViewAllProjects(session) || permittedProjectIds.length === 0) return [];

  const stocks = await prisma.projectMaterialStock.findMany({
    where: { projectId: { in: permittedProjectIds } },
    include: {
      project: { select: { id: true, code: true, name: true } },
      materialItem: { select: { code: true, name: true, unit: true, manufacturer: true, origin: true } },
    },
    orderBy: { materialItem: { name: "asc" } },
  });

  const grouped = new Map<string, PortfolioStockItemDto>();

  stocks.forEach((s) => {
    const key = `${s.materialItem.name.trim().toLocaleLowerCase("vi")}::${s.materialItem.unit.trim().toLocaleLowerCase("vi")}::${(s.materialItem.manufacturer || "").trim().toLocaleLowerCase("vi")}::${(s.materialItem.origin || "").trim().toLocaleLowerCase("vi")}`;
    const stockVal = Number(s.stock);
    const minVal = Number(s.minStockLevel);
    const isLow = (minVal > 0 && stockVal < minVal) || stockVal < 0;
    const hasStock = stockVal > 0;

    if (!grouped.has(key)) {
      grouped.set(key, {
        identity: key,
        code: s.materialItem.code,
        name: s.materialItem.name,
        unit: s.materialItem.unit,
        manufacturer: s.materialItem.manufacturer || null,
        origin: s.materialItem.origin || null,
        totalStock: stockVal,
        projectCount: 1,
        lowStockProjectCount: isLow ? 1 : 0,
        inStockProjectCount: hasStock ? 1 : 0,
        warning: isLow,
        lastUpdated: s.lastUpdated.toISOString(),
        projectsBreakdown: [
          {
            projectId: s.project.id,
            projectCode: s.project.code,
            projectName: s.project.name,
            stock: stockVal,
            minStockLevel: minVal,
            lastUpdated: s.lastUpdated.toISOString(),
          },
        ],
      });
    } else {
      const existing = grouped.get(key)!;
      existing.totalStock += stockVal;
      existing.projectCount += 1;
      if (isLow) {
        existing.lowStockProjectCount += 1;
        existing.warning = true;
      }
      if (hasStock) existing.inStockProjectCount += 1;
      if (new Date(s.lastUpdated) > new Date(existing.lastUpdated)) {
        existing.lastUpdated = s.lastUpdated.toISOString();
      }
      existing.projectsBreakdown.push({
        projectId: s.project.id,
        projectCode: s.project.code,
        projectName: s.project.name,
        stock: stockVal,
        minStockLevel: minVal,
        lastUpdated: s.lastUpdated.toISOString(),
      });
    }
  });

  return Array.from(grouped.values());
}

export async function getPortfolioTransactions(permittedProjectIds: string[]): Promise<MaterialMovementDto[]> {
  const session = await getSession();
  if (!session || !canViewAllProjects(session) || permittedProjectIds.length === 0) return [];

  const movements = await prisma.materialMovement.findMany({
    where: { projectId: { in: permittedProjectIds } },
    include: {
      materialItem: true,
      project: { select: { code: true, name: true } },
    },
    orderBy: { movementDate: "desc" },
  });

  return movements.map(toMovementDto);
}
