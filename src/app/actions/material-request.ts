"use server";

import prisma from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/rbac";
import { createWithUniqueMaterialRequestNo } from "@/lib/material-request-number";
import { revalidatePath } from "next/cache";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  const neededDate = validateDate(data?.neededDate, "ngày cần vật tư");
  if (dateKey(neededDate) < dateKey(requestDate)) {
    throw new Error("Ngày cần vật tư không được trước ngày đề xuất");
  }

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

  return { projectId, requestDate, neededDate, items };
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
  const { projectId, items, requestDate, neededDate } = validateMaterialRequestPayload(data);
  const rest = { ...data };
  delete rest.projectId;
  delete rest.items;
  delete rest.requestDate;
  delete rest.neededDate;

  // Guard: user must have access to this project
  const session = await requireProjectAccess(projectId);

  const request = await createWithUniqueMaterialRequestNo((requestNo) =>
    prisma.materialRequest.create({
      data: {
        ...rest,
        projectId,
        requestNo,
        requestDate,
        neededDate,
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
        dueDate: rest.neededDate ? new Date(rest.neededDate) : null,
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
  const { items, requestDate, neededDate } = validateMaterialRequestPayload(data);
  const rest = { ...data };
  delete rest.projectId;
  delete rest.items;
  delete rest.requestDate;
  delete rest.neededDate;

  // Verify exists and get projectId for access check
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  // Guard: user must have access to this project
  const session = await requireProjectAccess(existing.projectId);

  if (!["DRAFT", "REJECTED"].includes(existing.status)) {
    throw new Error("Chỉ có thể sửa phiếu nháp hoặc phiếu bị từ chối");
  }

  // Handle items: drop and recreate for safety
  await prisma.$transaction([
    prisma.materialRequestItem.deleteMany({ where: { materialRequestId: id } }),
    prisma.materialRequest.update({
      where: { id },
      data: {
        ...rest,
        requestDate,
        neededDate,
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
          dueDate: rest.neededDate ? new Date(rest.neededDate) : null,
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
          dueDate: rest.neededDate ? new Date(rest.neededDate) : null,
        }
      });
    }
  }

  revalidatePath('/materials');
  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function updateMaterialRequestStatus(id: string, status: any, cancelReason?: string) {
  const validStatuses = ["DRAFT", "REQUESTED", "SUBMITTED", "APPROVED", "REJECTED", "PROCESSING", "ISSUED", "RECEIVED", "CANCELLED"];
  if (!validStatuses.includes(status)) throw new Error("Trạng thái không hợp lệ");
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  // Guard: user must have access to this project
  await requireProjectAccess(existing.projectId);

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

  // Guard: user must have access to this project
  await requireProjectAccess(existing.projectId);
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
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  
  await requireProjectAccess(existing.projectId);
  
  if (!["DRAFT", "REJECTED"].includes(existing.status)) {
    throw new Error("Chỉ có thể xóa phiếu nháp hoặc phiếu bị từ chối");
  }
  
  await prisma.$transaction([
    prisma.materialRequestItem.updateMany({ 
      where: { materialRequestId: id },
      data: { deletedAt: new Date() }
    }),
    prisma.approvalRequest.updateMany({ 
      where: { sourceType: "MATERIAL_REQUEST", sourceId: id, deletedAt: null },
      data: { deletedAt: new Date() }
    }),
    prisma.materialRequest.update({ 
      where: { id },
      data: { deletedAt: new Date() }
    })
  ]);
  
  revalidatePath('/materials');
  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function cancelMaterialRequest(id: string, reason?: string) {
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  
  await requireProjectAccess(existing.projectId);
  
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

