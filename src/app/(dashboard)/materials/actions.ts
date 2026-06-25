"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ========================
// Fetch Projects
// ========================
export async function getActiveProjects() {
  const session = await getSession();
  if (!session) return [];

  // Filter projects by member if not ADMIN
  const whereClause = session.role === "ADMIN" ? { status: "ACTIVE" as any } : {
    status: "ACTIVE" as any,
    members: {
      some: {
        userId: session.id,
      },
    },
  };

  return await prisma.project.findMany({
    where: whereClause,
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: "desc" },
  });
}

// ========================
// Fetch Material Catalog
// ========================
export async function getMaterialItems() {
  const session = await getSession();
  if (!session) return [];

  return await prisma.materialItem.findMany({
    orderBy: { name: "asc" },
  });
}

// ========================
// Fetch Project Stocks
// ========================
export async function getProjectStocks(projectId: string) {
  const session = await getSession();
  if (!session) return [];

  // Security check: verify user has access to this project if not ADMIN
  if (session.role !== "ADMIN") {
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.id },
      },
    });
    if (!isMember) throw new Error("Unauthorized");
  }

  return await prisma.projectMaterialStock.findMany({
    where: { projectId },
    include: {
      materialItem: true,
    },
    orderBy: {
      materialItem: { name: "asc" },
    },
  });
}

// ========================
// Manage Material Item
// ========================
export async function createMaterialItem(data: { code: string; name: string; unit: string; group?: string; description?: string }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const existing = await prisma.materialItem.findUnique({ where: { code: data.code } });
  if (existing) throw new Error("Mã vật tư đã tồn tại");

  await prisma.materialItem.create({ data });
  revalidatePath("/materials");
}

export async function updateMaterialItem(id: string, data: { name: string; unit: string; group?: string; description?: string }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prisma.materialItem.update({
    where: { id },
    data,
  });
  revalidatePath("/materials");
}

// ========================
// Manage Stock Settings
// ========================
export async function setProjectMinStock(projectId: string, materialItemId: string, minStockLevel: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prisma.projectMaterialStock.upsert({
    where: {
      projectId_materialItemId: { projectId, materialItemId },
    },
    update: {
      minStockLevel,
    },
    create: {
      projectId,
      materialItemId,
      stock: 0,
      minStockLevel,
    },
  });
  revalidatePath("/materials");
}

// ========================
// Material Transactions
// ========================
export async function createMaterialTransaction(data: {
  projectId: string;
  materialItemId: string;
  type: "IMPORT" | "EXPORT" | "TRANSFER" | "RETURN";
  quantity: number;
  unitPrice?: number;
  movementDate: Date;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Auth check
  if (session.role !== "ADMIN") {
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: data.projectId, userId: session.id } },
    });
    if (!isMember) throw new Error("Unauthorized");
  }

  if (data.quantity <= 0) {
    throw new Error("Số lượng phải lớn hơn 0");
  }

  // Use transaction to update stock and create movement
  await prisma.$transaction(async (tx) => {
    // 1. Get or create stock record
    const stockRecord = await tx.projectMaterialStock.findUnique({
      where: {
        projectId_materialItemId: { projectId: data.projectId, materialItemId: data.materialItemId },
      },
    });

    const currentStock = stockRecord ? Number(stockRecord.stock) : 0;
    
    // 2. Calculate new stock
    let stockDelta = 0;
    if (data.type === "IMPORT" || data.type === "RETURN") {
      stockDelta = data.quantity;
    } else if (data.type === "EXPORT" || data.type === "TRANSFER") {
      stockDelta = -data.quantity;
      if (currentStock < data.quantity) {
        throw new Error("Số lượng xuất vượt quá tồn kho hiện tại");
      }
    }

    const newStock = currentStock + stockDelta;

    // 3. Update or create stock
    await tx.projectMaterialStock.upsert({
      where: {
        projectId_materialItemId: { projectId: data.projectId, materialItemId: data.materialItemId },
      },
      update: {
        stock: newStock,
        lastUpdated: new Date(),
      },
      create: {
        projectId: data.projectId,
        materialItemId: data.materialItemId,
        stock: newStock,
      },
    });

    // 4. Create movement record
    await tx.materialMovement.create({
      data: {
        projectId: data.projectId,
        materialItemId: data.materialItemId,
        type: data.type,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        movementDate: data.movementDate,
        notes: data.notes,
      },
    });
  });

  revalidatePath("/materials");
}

export async function getRecentTransactions(projectId: string) {
  const session = await getSession();
  if (!session) return [];
  
  if (session.role !== "ADMIN") {
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.id } },
    });
    if (!isMember) return [];
  }

  return await prisma.materialMovement.findMany({
    where: { projectId },
    include: {
      materialItem: true,
    },
    orderBy: { movementDate: "desc" },
    take: 50,
  });
}
