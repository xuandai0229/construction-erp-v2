"use server";

import prisma from "@/lib/prisma";
import { canViewAllProjects, isSystemAdmin, requireProjectAccess } from "@/lib/rbac";
import { serializeMaterialRequest, serializeMaterialRequestItem } from "@/lib/material-request/serializers";
import { createWithUniqueMaterialRequestNo } from "@/lib/material-request-number";
import { revalidatePath } from "next/cache";
import { assertMaterialPermission, getProjectMaterialPermissions } from "@/lib/materials/materials-access";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value: any) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function validateQty(val: any) {
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) throw new Error("Số lượng không hợp lệ");
  return num;
}

function validatePositiveQty(val: any, fieldName = "Số lượng đề xuất") {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) throw new Error(`${fieldName} phải lớn hơn 0`);
  return num;
}

function validateDate(value: unknown, fieldName: string) {
  if (!value) throw new Error(`Vui lòng chọn ${fieldName}`);
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) throw new Error(`${fieldName} không hợp lệ`);
  return date;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function validateMaterialRequestPayload(data: any) {
  const projectId = normalizeText(data?.projectId);
  if (!projectId) throw new Error("Vui lòng chọn công trình");

  const requestDate = data?.requestDate ? validateDate(data.requestDate, "ngày đề xuất") : new Date();

  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error("Vui lòng thêm ít nhất một dòng vật tư");
  }

  items.forEach((item: any, index: number) => {
    const line = `Dòng ${index + 1}`;
    if (!normalizeText(item?.materialName)) throw new Error(`${line}: Tên vật tư là bắt buộc`);
    if (!normalizeText(item?.unit)) throw new Error(`${line}: Đơn vị tính là bắt buộc`);
    const requestedQuantity = validatePositiveQty(item?.requestedQuantity, `${line}: Số lượng đề xuất`);
    const issuedQuantity = validateQty(item?.issuedQuantity);
    const receivedQuantity = validateQty(item?.receivedQuantity);
    if (issuedQuantity > requestedQuantity) {
      throw new Error(`${line}: Số lượng đã cấp không được lớn hơn số lượng đề xuất`);
    }
    if (receivedQuantity > issuedQuantity) {
      throw new Error(`${line}: Số lượng đã nhận không được lớn hơn số lượng đã cấp`);
    }
  });

  return { projectId, requestDate, items };
}

function validateMaterialRequestProgressItems(itemsData: any[]) {
  if (!Array.isArray(itemsData) || itemsData.length === 0) {
    throw new Error("Vui lòng cập nhật ít nhất một dòng vật tư");
  }

  itemsData.forEach((item: any, index: number) => {
    const line = normalizeText(item?.materialName) || `Dòng ${index + 1}`;
    const reqQty = validatePositiveQty(item?.requestedQuantity, `${line}: Số lượng đề xuất`);
    const issQty = validateQty(item?.issuedQuantity);
    const recvQty = validateQty(item?.receivedQuantity);
    if (issQty > reqQty) {
      throw new Error(`${line}: Số lượng đã cấp không được lớn hơn số lượng đề xuất`);
    }
    if (recvQty > issQty) {
      throw new Error(`${line}: Số lượng đã nhận không được lớn hơn số lượng đã cấp`);
    }
  });
}

export async function createMaterialRequest(data: any) {
  const { items, projectId, requestDate } = validateMaterialRequestPayload(data);
  const rest = { ...data };
  delete rest.projectId;
  delete rest.items;
  delete rest.requestDate;
  delete rest.neededDate;

  const session = await requireProjectAccess(projectId);
  const perms = await getProjectMaterialPermissions(session, projectId);
  assertMaterialPermission(perms, "canViewPurchase");
  assertMaterialPermission(perms, "canCreate");

  const request = await createWithUniqueMaterialRequestNo((requestNo) =>
    prisma.materialRequest.create({
      data: {
        ...rest,
        projectId,
        requestNo,
        requestDate,
        neededDate: null,
        requestedById: session.id,
        items: {
          create: items.map((item: any) => ({
            wbsItemId: item.wbsItemId,
            fieldProgressItemId: item.fieldProgressItemId,
            workItemNameSnapshot: item.workItemNameSnapshot,
            materialCode: item.materialCode,
            materialName: normalizeText(item.materialName),
            unit: normalizeText(item.unit),
            requestedQuantity: validatePositiveQty(item.requestedQuantity),
            issuedQuantity: validateQty(item.issuedQuantity),
            receivedQuantity: validateQty(item.receivedQuantity),
            remainingQuantity: Math.max(0, validateQty(item.requestedQuantity) - validateQty(item.receivedQuantity)),
            note: item.note,
          }))
        }
      }
    })
  );

  // If status is SUBMITTED, create an ApprovalRequest
  if (rest.status === "SUBMITTED") {
    const totalItems = items.length;
    await prisma.approvalRequest.create({
      data: {
        code: `APP-${request.requestNo}`,
        projectId,
        title: `Yêu cầu vật tư: ${request.requestNo}`,
        description: rest.note || `Yêu cầu ${totalItems} loại vật tư`,
        type: "MATERIAL",
        status: "PENDING",
        priority: rest.priority === "URGENT" || rest.priority === "HIGH" ? "HIGH" : "NORMAL",
        dueDate: null,
        requesterId: session.id,
        sourceType: "MATERIAL_REQUEST",
        sourceId: request.id,
      }
    });
  }

  revalidatePath('/materials');
  revalidatePath(`/projects/${projectId}/material-requests`);
  return { success: true, data: request };
}

export async function updateMaterialRequest(id: string, data: any) {
  const { items, requestDate } = validateMaterialRequestPayload(data);
  const rest = { ...data };
  delete rest.projectId;
  delete rest.items;
  delete rest.requestDate;
  delete rest.neededDate;

  // Verify exists and get projectId for access check
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const session = await requireProjectAccess(existing.projectId);
  const perms = await getProjectMaterialPermissions(session, existing.projectId);

  const isOwner = existing.requestedById === session.id;
  const isManager = perms.canUpdateMaterialRequests;
  if (!isOwner && !isManager) {
    throw new Error("Bạn không có quyền sửa đề xuất này trong công trình hiện tại.");
  }

  if (!["DRAFT", "SUBMITTED", "REQUESTED"].includes(existing.status)) {
    throw new Error("Chỉ có thể sửa đề xuất nháp hoặc đang chờ duyệt.");
  }

  // Handle items: drop and recreate for safety
  await prisma.$transaction([
    prisma.materialRequestItem.deleteMany({ where: { materialRequestId: id } }),
    prisma.materialRequest.update({
      where: { id },
      data: {
        ...rest,
        requestDate,
        neededDate: null,
        items: {
          create: items.map((item: any) => ({
            wbsItemId: item.wbsItemId,
            fieldProgressItemId: item.fieldProgressItemId,
            workItemNameSnapshot: item.workItemNameSnapshot,
            materialCode: item.materialCode,
            materialName: normalizeText(item.materialName),
            unit: normalizeText(item.unit),
            requestedQuantity: validatePositiveQty(item.requestedQuantity),
            issuedQuantity: validateQty(item.issuedQuantity),
            receivedQuantity: validateQty(item.receivedQuantity),
            remainingQuantity: Math.max(0, validateQty(item.requestedQuantity) - validateQty(item.receivedQuantity)),
            note: item.note,
          }))
        }
      }
    })
  ]);

  if (rest.status === "SUBMITTED") {
    // Check if an approval request already exists
    const existingApproval = await prisma.approvalRequest.findFirst({
      where: { sourceType: "MATERIAL_REQUEST", sourceId: id }
    });

    if (!existingApproval) {
      const totalItems = items.length;
      await prisma.approvalRequest.create({
        data: {
          code: `APP-${existing.requestNo}`,
          projectId: existing.projectId,
          title: `Yêu cầu vật tư: ${existing.requestNo}`,
          description: rest.note || `Yêu cầu ${totalItems} loại vật tư`,
          type: "MATERIAL",
          status: "PENDING",
          priority: rest.priority === "URGENT" || rest.priority === "HIGH" ? "HIGH" : "NORMAL",
          dueDate: null,
          requesterId: session.id,
          sourceType: "MATERIAL_REQUEST",
          sourceId: id,
        }
      });
    } else if (existingApproval.status === "REJECTED" || existingApproval.status === "CANCELLED") {
      // If previous approval was rejected or cancelled, recreate or update it
      await prisma.approvalRequest.update({
        where: { id: existingApproval.id },
        data: {
          status: "PENDING",
          description: rest.note || existingApproval.description,
          priority: rest.priority === "URGENT" || rest.priority === "HIGH" ? "HIGH" : "NORMAL",
          dueDate: null,
        }
      });
    }
  }

  revalidatePath('/materials');
  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function approveMaterialRequest(id: string) {
  const existing = await prisma.materialRequest.findUnique({ 
    where: { id },
    include: { items: true }
  });
  if (!existing) throw new Error("Not found");

  const session = await requireProjectAccess(existing.projectId);
  const perms = await getProjectMaterialPermissions(session, existing.projectId);
  assertMaterialPermission(perms, "canApproveRequest");

  if (existing.requestedById === session.id && !isSystemAdmin(session)) {
    throw new Error("Bạn không thể tự duyệt phiếu vật tư của chính mình");
  }

  if (existing.status !== "SUBMITTED" && existing.status !== "DRAFT" && existing.status !== "REQUESTED") {
    throw new Error("Trạng thái phiếu không hợp lệ để duyệt");
  }

  // Handle MaterialItem linking/creation and stock
  await prisma.$transaction(async (tx) => {
    // 1. Update status
    await tx.materialRequest.update({
      where: { id },
      data: { status: "APPROVED" }
    });

    // 2. Process each item
    for (const item of existing.items) {
      const materialName = item.materialName.trim();
      const unit = item.unit.trim();
      const normalizedName = materialName.toLowerCase().replace(/\s+/g, ' ');
      const normalizedUnit = unit.toLowerCase().replace(/\s+/g, ' ');

      // Find matching MaterialItem
      const existingMaterials = await tx.materialItem.findMany({
        where: { projectId: existing.projectId }
      });

      const matchedMaterial = existingMaterials.find(m => 
        m.name.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedName &&
        m.unit.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedUnit
      );

      let materialItemId = matchedMaterial?.id;
      let materialToLink = matchedMaterial;

      if (!matchedMaterial) {
        // Create new
        const newCode = `VT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        materialToLink = await tx.materialItem.create({
          data: {
            projectId: existing.projectId,
            code: newCode,
            name: materialName,
            unit: unit,
            isActive: true,
          }
        });
        materialItemId = materialToLink.id;
      }

      // Link request item to material via materialCode and update receivedQuantity
      if (materialToLink) {
        await tx.materialRequestItem.update({
          where: { id: item.id },
          data: { 
            materialCode: materialToLink.code,
            receivedQuantity: item.requestedQuantity 
          }
        });
      }

      // Auto-Import Stock
      // 1. Ensure Stock Record Exists
      const stockRecord = await tx.projectMaterialStock.upsert({
        where: { projectId_materialItemId: { projectId: existing.projectId, materialItemId: materialItemId! } },
        update: {
          stock: { increment: item.requestedQuantity },
          lastUpdated: new Date()
        },
        create: {
          projectId: existing.projectId,
          materialItemId: materialItemId!,
          stock: item.requestedQuantity,
          minStockLevel: 0
        }
      });

      // 2. Create MaterialMovement
      await tx.materialMovement.create({
        data: {
          projectId: existing.projectId,
          materialItemId: materialItemId!,
          materialRequestId: existing.id,
          materialRequestItemId: item.id,
          type: "IMPORT",
          quantity: item.requestedQuantity,
          movementDate: new Date(),
          notes: "Nhập kho từ đề xuất vật tư",
          materialCodeSnapshot: materialToLink!.code,
          materialNameSnapshot: materialToLink!.name,
          unitSnapshot: materialToLink!.unit
        }
      });
    }

    // 3. Update ApprovalRequest if exists
    await tx.approvalRequest.updateMany({
      where: { sourceType: "MATERIAL_REQUEST", sourceId: id, status: "PENDING" },
      data: { 
        status: "APPROVED",
        decidedById: session.id,
        decidedAt: new Date(),
        decisionNote: "Duyệt trực tiếp từ module Vật tư"
      }
    });

    // 4. Audit
    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: existing.projectId,
        action: "MATERIAL_REQUEST_APPROVED",
        entityType: "MaterialRequest",
        entityId: id,
        afterData: JSON.stringify({ status: "APPROVED" })
      }
    });
  });

  revalidatePath('/materials');
  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function rejectMaterialRequest(id: string, reason: string) {
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const session = await requireProjectAccess(existing.projectId);
  const perms = await getProjectMaterialPermissions(session, existing.projectId);
  assertMaterialPermission(perms, "canApproveRequest");

  if (existing.requestedById === session.id && !isSystemAdmin(session)) {
    throw new Error("Bạn không thể tự từ chối phiếu vật tư của chính mình");
  }

  if (existing.status !== "SUBMITTED" && existing.status !== "DRAFT" && existing.status !== "REQUESTED") {
    throw new Error("Trạng thái phiếu không hợp lệ để từ chối");
  }

  await prisma.$transaction(async (tx) => {
    await tx.materialRequest.update({
      where: { id },
      data: { 
        status: "REJECTED",
        cancelReason: reason
      }
    });

    await tx.approvalRequest.updateMany({
      where: { sourceType: "MATERIAL_REQUEST", sourceId: id, status: "PENDING" },
      data: { 
        status: "REJECTED",
        decidedById: session.id,
        decidedAt: new Date(),
        decisionNote: reason
      }
    });
    
    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: existing.projectId,
        action: "MATERIAL_REQUEST_REJECTED",
        entityType: "MaterialRequest",
        entityId: id,
        afterData: JSON.stringify({ status: "REJECTED", reason })
      }
    });
  });

  revalidatePath('/materials');
  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function updateMaterialRequestStatus(id: string, status: any, cancelReason?: string) {
  const validStatuses = ["DRAFT", "REQUESTED", "SUBMITTED", "APPROVED", "REJECTED", "PROCESSING", "ISSUED", "RECEIVED", "CANCELLED"];
  if (!validStatuses.includes(status)) throw new Error("Trạng thái không hợp lệ");
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const session = await requireProjectAccess(existing.projectId);
  const perms = await getProjectMaterialPermissions(session, existing.projectId);
  assertMaterialPermission(perms, "canViewPurchase");
  if (status === "APPROVED" || status === "REJECTED") {
    assertMaterialPermission(perms, "canApproveRequest");
    if (existing.requestedById === session.id && !isSystemAdmin(session)) {
      throw new Error("Bạn không thể tự duyệt/từ chối phiếu vật tư của chính mình");
    }
  } else if (status === "PROCESSING" || status === "ISSUED") {
    assertMaterialPermission(perms, "canExport");
  } else if (status === "RECEIVED") {
    assertMaterialPermission(perms, "canImport");
  } else if (status === "CANCELLED") {
    if (existing.requestedById !== session.id && !perms.canDelete) {
      throw new Error("Bạn không có quyền hủy phiếu vật tư này");
    }
  } else if (status === "SUBMITTED") {
    if (existing.requestedById !== session.id && !perms.canUpdate) {
      throw new Error("Bạn không có quyền gửi duyệt phiếu vật tư này");
    }
  } else {
    assertMaterialPermission(perms, "canUpdate");
  }

  const updated = await prisma.materialRequest.update({
    where: { id },
    data: { status, cancelReason }
  });

  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true, data: updated };
}

export async function updateMaterialRequestItems(id: string, itemsData: any[]) {
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const session = await requireProjectAccess(existing.projectId);
  const perms = await getProjectMaterialPermissions(session, existing.projectId);
  assertMaterialPermission(perms, "canExport");
  if (!["APPROVED", "PROCESSING", "ISSUED"].includes(existing.status)) {
    throw new Error("Chỉ có thể cập nhật cấp/nhận cho phiếu đã duyệt hoặc đang xử lý");
  }
  validateMaterialRequestProgressItems(itemsData);

  for (const item of itemsData) {
    const reqQty = validatePositiveQty(item.requestedQuantity);
    const recvQty = validateQty(item.receivedQuantity);
    const issQty = validateQty(item.issuedQuantity);
    const remaining = reqQty - recvQty;
    await prisma.materialRequestItem.updateMany({
      where: { id: item.id, materialRequestId: id },
      data: {
        issuedQuantity: issQty,
        receivedQuantity: recvQty,
        remainingQuantity: remaining > 0 ? remaining : 0
      }
    });
  }

  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function deleteMaterialRequest(id: string) {
  const existing = await prisma.materialRequest.findUnique({ 
    where: { id },
    include: { items: true }
  });
  if (!existing) throw new Error("Not found");
  
  const session = await requireProjectAccess(existing.projectId);
  const perms = await getProjectMaterialPermissions(session, existing.projectId);
  
  const isOwner = existing.requestedById === session.id;
  const isManager = session.role === "ADMIN" || session.role === "DIRECTOR";
  if (!isOwner && !isManager && !perms.canDelete) {
    throw new Error("Bạn không có quyền xóa đề xuất này");
  }

  if (["APPROVED", "PROCESSING", "ISSUED", "RECEIVED"].includes(existing.status)) {
    throw new Error("Không thể xóa đề xuất đã được duyệt hoặc xử lý");
  }
  
  await prisma.$transaction(async (tx) => {
    // Now delete request items
    await tx.materialRequestItem.deleteMany({ 
      where: { materialRequestId: id }
    });
    
    // Delete ApprovalRequest
    await tx.approvalRequest.deleteMany({ 
      where: { sourceType: "MATERIAL_REQUEST", sourceId: id }
    });
    
    // Finally delete request
    await tx.materialRequest.delete({ 
      where: { id }
    });
  });
  
  revalidatePath('/materials');
  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function cancelMaterialRequest(id: string, reason?: string) {
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  
  const session = await requireProjectAccess(existing.projectId);
  const perms = await getProjectMaterialPermissions(session, existing.projectId);
  if (existing.requestedById !== session.id && !perms.canDelete) {
    throw new Error("Bạn không có quyền hủy phiếu vật tư này");
  }
  
  if (existing.status !== "SUBMITTED") {
    throw new Error("Chỉ có thể hủy phiếu đang chờ duyệt");
  }
  
  await prisma.$transaction([
    prisma.materialRequest.update({
      where: { id },
      data: { status: "CANCELLED", cancelReason: reason || "Người dùng hủy phiếu" }
    }),
    prisma.approvalRequest.updateMany({
      where: { sourceType: "MATERIAL_REQUEST", sourceId: id, status: "PENDING" },
      data: { status: "CANCELLED", decisionNote: reason || "Người yêu cầu đã hủy" }
    })
  ]);
  
  revalidatePath('/materials');
  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function getApprovedProposalSummaryByMaterial(projectId: string, materialId?: string, materialCode?: string) {
  if (!materialCode && !materialId) return null;
  
  const material = materialId 
    ? await prisma.materialItem.findUnique({ where: { id: materialId } })
    : await prisma.materialItem.findFirst({ where: { projectId, code: materialCode } });
    
  if (!material) return null;

  const items = await prisma.materialRequestItem.findMany({
    where: {
      materialCode: material.code,
      materialRequest: {
        projectId,
        status: "APPROVED"
      }
    },
    include: {
      materialRequest: {
        include: {
          requestedBy: {
            select: { name: true, email: true }
          }
        }
      }
    },
    orderBy: {
      materialRequest: { requestDate: 'desc' }
    }
  });

  if (items.length === 0) return null;

  const approvedRequestedQuantityTotal = items.reduce((sum, item) => sum + Number(item.requestedQuantity), 0);
  const importedFromProposalQuantity = items.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
  
  return {
    approvedRequestCount: items.length,
    approvedRequestedQuantityTotal,
    importedFromProposalQuantity,
    latestApprovedRequest: items[0].materialRequest ? serializeMaterialRequest(items[0].materialRequest) : null,
    relatedRequests: items.map(serializeMaterialRequestItem)
  };
}
