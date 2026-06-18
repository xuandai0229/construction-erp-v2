"use server";

import prisma from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/rbac";
import { createWithUniqueMaterialRequestNo } from "@/lib/material-request-number";
import { revalidatePath } from "next/cache";

export async function createMaterialRequest(data: any) {
  const { projectId, items, ...rest } = data;
  
  // Guard: user must have access to this project
  const session = await requireProjectAccess(projectId);

  const request = await createWithUniqueMaterialRequestNo((requestNo) =>
    prisma.materialRequest.create({
        data: {
          ...rest,
          projectId,
          requestNo,
          requestedById: session.id,
          items: {
            create: items.map((item: any) => ({
              wbsItemId: item.wbsItemId,
              fieldProgressItemId: item.fieldProgressItemId,
              workItemNameSnapshot: item.workItemNameSnapshot,
              materialCode: item.materialCode,
              materialName: item.materialName,
              unit: item.unit,
              requestedQuantity: item.requestedQuantity,
              issuedQuantity: item.issuedQuantity || 0,
              receivedQuantity: item.receivedQuantity || 0,
              remainingQuantity: Math.max(0, Number(item.requestedQuantity || 0) - Number(item.receivedQuantity || 0)),
              note: item.note,
            }))
          }
        }
      })
  );

  revalidatePath(`/projects/${projectId}/material-requests`);
  return { success: true, data: request };
}

export async function updateMaterialRequest(id: string, data: any) {
  const { items, ...rest } = data;

  // Verify exists and get projectId for access check
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  
  // Guard: user must have access to this project
  await requireProjectAccess(existing.projectId);
  
  if (existing.status === "RECEIVED" || existing.status === "CANCELLED") {
    throw new Error("Cannot edit request in this status");
  }

  // Handle items: drop and recreate for safety
  await prisma.$transaction([
    prisma.materialRequestItem.deleteMany({ where: { materialRequestId: id } }),
    prisma.materialRequest.update({
      where: { id },
      data: {
        ...rest,
        items: {
          create: items.map((item: any) => ({
            wbsItemId: item.wbsItemId,
            fieldProgressItemId: item.fieldProgressItemId,
            workItemNameSnapshot: item.workItemNameSnapshot,
            materialCode: item.materialCode,
            materialName: item.materialName,
            unit: item.unit,
            requestedQuantity: item.requestedQuantity,
            issuedQuantity: item.issuedQuantity || 0,
            receivedQuantity: item.receivedQuantity || 0,
            remainingQuantity: Math.max(0, Number(item.requestedQuantity || 0) - Number(item.receivedQuantity || 0)),
            note: item.note,
          }))
        }
      }
    })
  ]);

  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}

export async function updateMaterialRequestStatus(id: string, status: any, cancelReason?: string) {
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

  for (const item of itemsData) {
    const remaining = Number(item.requestedQuantity) - Number(item.receivedQuantity);
    await prisma.materialRequestItem.update({
      where: { id: item.id },
      data: {
        issuedQuantity: item.issuedQuantity,
        receivedQuantity: item.receivedQuantity,
        remainingQuantity: remaining > 0 ? remaining : 0
      }
    });
  }

  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true };
}
