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
  materialRequestId?: string | null;
  materialRequestItemId?: string | null;
}

const OUTBOUND_TYPES: MaterialMovementType[] = ["EXPORT", "TRANSFER"];

export function parsePositiveQuantity(value: unknown, fieldName = "Số lượng") {
  if (value === "" || value === null || value === undefined) throw new Error(`${fieldName} không hợp lệ`);
  const quantity = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`${fieldName} phải lớn hơn 0`);
  }
  return quantity;
}

export function parseNonNegativeQuantity(value: unknown, fieldName = "Số lượng") {
  if (value === "" || value === null || value === undefined) throw new Error(`${fieldName} không hợp lệ`);
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
    select: { id: true, projectId: true, code: true, name: true, unit: true, isActive: true },
  });
  if (!material) {
    throw new Error("Vật tư không tồn tại");
  }
  if (material.projectId !== input.projectId) {
    throw new Error("Vật tư không thuộc công trình này");
  }

  if (!material.isActive) {
    throw new Error("Vật tư đã lưu trữ, không thể tạo giao dịch mới");
  }

  if (input.materialRequestItemId && OUTBOUND_TYPES.includes(input.type)) {
    const requestItem = await tx.materialRequestItem.findUnique({
      where: { id: input.materialRequestItemId },
      include: { materialRequest: true },
    });
    if (!requestItem) throw new Error("Mục yêu cầu vật tư không tồn tại");
    if (requestItem.deletedAt) throw new Error("Mục yêu cầu vật tư đã bị xóa");
    if (requestItem.materialRequest.projectId !== input.projectId) throw new Error("Phiếu yêu cầu không thuộc công trình này");
    
    const validStatuses = ["APPROVED", "PROCESSING", "ISSUED"];
    if (!validStatuses.includes(requestItem.materialRequest.status)) {
      throw new Error(`Không thể xuất kho từ phiếu có trạng thái ${requestItem.materialRequest.status}`);
    }

    if (quantity > Number(requestItem.remainingQuantity)) {
      throw new Error("Số lượng xuất vượt quá số lượng còn lại cần cấp của yêu cầu");
    }

    // Cập nhật item
    await tx.materialRequestItem.update({
      where: { id: input.materialRequestItemId },
      data: {
        issuedQuantity: { increment: quantity },
        remainingQuantity: { decrement: quantity },
      },
    });

    // Tính lại status của request
    const allItems = await tx.materialRequestItem.findMany({
      where: { materialRequestId: requestItem.materialRequestId, deletedAt: null },
    });
    const allIssued = allItems.every(i => 
      i.id === input.materialRequestItemId 
        ? Number(i.remainingQuantity) - quantity <= 0 
        : Number(i.remainingQuantity) <= 0
    );
    
    await tx.materialRequest.update({
      where: { id: requestItem.materialRequestId },
      data: {
        status: allIssued ? "ISSUED" : "PROCESSING",
      },
    });
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

  const modelFields = Prisma.dmmf.datamodel.models.find(m => m.name === "MaterialMovement")?.fields || [];
  const hasSnapshotFields = modelFields.some(f => f.name === "materialCodeSnapshot");

  const movementData: any = {
    projectId: input.projectId,
    materialItemId: input.materialItemId,
    type: input.type,
    quantity,
    unitPrice: input.unitPrice ?? undefined,
    movementDate,
    notes: input.notes?.trim() || undefined,
  };

  if (hasSnapshotFields) {
    movementData.materialRequestId = input.materialRequestId || undefined;
    movementData.materialRequestItemId = input.materialRequestItemId || undefined;
    movementData.materialCodeSnapshot = material.code;
    movementData.materialNameSnapshot = material.name;
    movementData.unitSnapshot = material.unit;
  }

  const movement = await tx.materialMovement.create({
    data: movementData,
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
