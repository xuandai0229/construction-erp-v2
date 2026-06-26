"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { applyMaterialMovement, parseNonNegativeQuantity, parsePositiveQuantity } from "@/lib/materials/ledger";
import { MaterialMovementType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getMaterialPermissions, MaterialPermissionSet } from "@/lib/materials/materials-permissions";

const MATERIALS_PATH = "/materials";

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export interface MaterialItemDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  group: string | null;
  description: string | null;
  isActive: boolean;
  hasMovement: boolean;
  createdAt: string;
  updatedAt: string;
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
  group: string | null;
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
    group: item.group,
    description: item.description,
    isActive: item.isActive,
    hasMovement: item._count ? item._count.movements > 0 : false,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
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
  if (session.role !== "ADMIN") {
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

function assertPermission(permissions: MaterialPermissionSet, action: keyof MaterialPermissionSet) {
  if (!permissions[action]) {
    throw new Error("Bạn không có quyền thực hiện thao tác vật tư này.");
  }
}

// ========================
// Fetch Projects
// ========================
export async function getActiveProjects() {
  const session = await getSession();
  if (!session) return [];

  const whereClause =
    session.role === "ADMIN"
      ? { status: "ACTIVE" as const, deletedAt: null }
      : {
          status: "ACTIVE" as const,
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
    select: { id: true, name: true, code: true },
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
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });

  return items.map(toMaterialItemDto);
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
  group?: string;
  description?: string;
  minStockLevel?: number;
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
  assertPermission(perms, "canCreate");

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
          group: normalizeOptionalText(data.group),
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
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Mã vật tư đã tồn tại");
    }
    throw error;
  }

  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

export async function updateMaterialItem(id: string, data: { name: string; unit: string; group?: string; description?: string }) {
  const session = await requireSession();

  const name = normalizeText(data.name);
  const unit = normalizeText(data.unit);
  if (!name) throw new Error("Tên vật tư là bắt buộc");
  if (!unit) throw new Error("Đơn vị tính là bắt buộc");

  const material = await prisma.materialItem.findUnique({
    where: { id },
    select: { id: true, projectId: true, unit: true },
  });
  if (!material) throw new Error("Vật tư không tồn tại");
  if (!material.projectId) throw new Error("Vật tư không thuộc công trình nào");

  const perms = await requireProjectPermissions(session, material.projectId);
  assertPermission(perms, "canUpdate");

  // Cho phép sửa toàn bộ, không chặn đổi đơn vị tính

  await prisma.materialItem.update({
    where: { id },
    data: {
      name,
      unit,
      group: normalizeOptionalText(data.group),
      description: normalizeOptionalText(data.description),
    },
  });
  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}

export async function deleteMaterialItem(id: string) {
  const session = await requireSession();

  const material = await prisma.materialItem.findUnique({
    where: { id },
    select: { id: true, projectId: true },
  });
  if (!material) throw new Error("Vật tư không tồn tại");
  if (!material.projectId) throw new Error("Vật tư không thuộc công trình nào");

  const perms = await requireProjectPermissions(session, material.projectId);
  assertPermission(perms, "canDelete");

  await prisma.$transaction([
    prisma.materialMovement.deleteMany({
      where: { materialItemId: id, projectId: material.projectId },
    }),
    prisma.projectMaterialStock.deleteMany({
      where: { materialItemId: id, projectId: material.projectId },
    }),
    prisma.materialItem.delete({
      where: { id },
    }),
  ]);

  revalidatePath(MATERIALS_PATH);
  return { ok: true };
}


// ========================
// Manage Stock Settings
// ========================
export async function setProjectMinStock(projectId: string, materialItemId: string, minStockLevel: number) {
  const session = await requireSession();
  const perms = await requireProjectPermissions(session, projectId);
  assertPermission(perms, "canUpdate");

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
  if (type === "IMPORT") assertPermission(perms, "canImport");
  if (type === "EXPORT") assertPermission(perms, "canExport");

  await prisma.$transaction((tx) =>
    applyMaterialMovement(tx, {
      projectId,
      materialItemId,
      type,
      quantity,
      unitPrice,
      movementDate,
      notes: normalizeOptionalText(data.notes),
    })
  );

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
    take: 50,
  });

  return movements.map(toMovementDto);
}
