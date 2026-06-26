import { MaterialMovementType, Prisma } from "@prisma/client";

export type MaterialLedgerTx = Prisma.TransactionClient;

export interface ApplyMaterialMovementInput {
  projectId: string;
  materialItemId: string;
  type: MaterialMovementType;
  quantity: number;
  unitPrice?: number | null;
  movementDate: Date;
  notes?: string | null;
  minStockLevel?: number;
}

const OUTBOUND_TYPES: MaterialMovementType[] = ["EXPORT", "TRANSFER"];

export function parsePositiveQuantity(value: unknown, fieldName = "Số lượng") {
  const quantity = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`${fieldName} phải lớn hơn 0`);
  }
  return quantity;
}

export function parseNonNegativeQuantity(value: unknown, fieldName = "Số lượng") {
  const quantity = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`${fieldName} không được nhỏ hơn 0`);
  }
  return quantity;
}

export async function applyMaterialMovement(tx: MaterialLedgerTx, input: ApplyMaterialMovementInput) {
  const quantity = parsePositiveQuantity(input.quantity);
  const movementDate = input.movementDate instanceof Date ? input.movementDate : new Date(input.movementDate);

  if (Number.isNaN(movementDate.getTime())) {
    throw new Error("Ngày giao dịch không hợp lệ");
  }

  const material = await tx.materialItem.findUnique({
    where: { id: input.materialItemId },
    select: { id: true, projectId: true },
  });
  if (!material) {
    throw new Error("Vật tư không tồn tại");
  }
  if (material.projectId !== input.projectId) {
    throw new Error("Vật tư không thuộc công trình này");
  }

  if (OUTBOUND_TYPES.includes(input.type)) {
    const updated = await tx.projectMaterialStock.updateMany({
      where: {
        projectId: input.projectId,
        materialItemId: input.materialItemId,
        stock: { gte: quantity },
      },
      data: {
        stock: { decrement: quantity },
        lastUpdated: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new Error("Số lượng xuất vượt quá tồn kho hiện tại");
    }
  } else {
    await tx.projectMaterialStock.upsert({
      where: {
        projectId_materialItemId: {
          projectId: input.projectId,
          materialItemId: input.materialItemId,
        },
      },
      update: {
        stock: { increment: quantity },
        lastUpdated: new Date(),
      },
      create: {
        projectId: input.projectId,
        materialItemId: input.materialItemId,
        stock: quantity,
        minStockLevel: input.minStockLevel ?? 0,
      },
    });
  }

  const movement = await tx.materialMovement.create({
    data: {
      projectId: input.projectId,
      materialItemId: input.materialItemId,
      type: input.type,
      quantity,
      unitPrice: input.unitPrice ?? undefined,
      movementDate,
      notes: input.notes?.trim() || undefined,
    },
  });

  const stock = await tx.projectMaterialStock.findUnique({
    where: {
      projectId_materialItemId: {
        projectId: input.projectId,
        materialItemId: input.materialItemId,
      },
    },
  });

  return { movement, stock };
}
