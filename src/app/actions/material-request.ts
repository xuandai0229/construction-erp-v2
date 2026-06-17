"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createMaterialRequest(data: any) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const { projectId, items, ...rest } = data;

  // Generate requestNo
  const count = await prisma.materialRequest.count({ where: { projectId } });
  const requestNo = `MR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

  const request = await prisma.materialRequest.create({
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
          note: item.note,
        }))
      }
    }
  });

  revalidatePath(`/projects/${projectId}/material-requests`);
  return { success: true, data: request };
}

export async function updateMaterialRequest(id: string, data: any) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const { items, ...rest } = data;

  // Verify status allows editing
  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");
  if (existing.status === "RECEIVED" || existing.status === "CANCELLED") {
    throw new Error("Cannot edit request in this status");
  }

  // Handle items: this is a simple drop and recreate for MVP, or we can carefully update
  // For safety, let's delete existing items and recreate
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
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const updated = await prisma.materialRequest.update({
    where: { id },
    data: { status, cancelReason }
  });

  revalidatePath(`/projects/${existing.projectId}/material-requests`);
  return { success: true, data: updated };
}

export async function updateMaterialRequestItems(id: string, itemsData: any[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const existing = await prisma.materialRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

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
