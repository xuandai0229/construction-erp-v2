"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { requireProjectAccess } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function getOrCreateTemplate(projectId: string) {
  const session = await requireProjectAccess(projectId);

  let template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId, deletedAt: null },
    include: {
      items: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }
    }
  });

  if (!template) {
    template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId,
        name: "Bảng khối lượng hiện trường",
        createdById: session.id,
      },
      include: { items: true }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "CREATE_FIELD_PROGRESS_TEMPLATE",
      entityType: "FieldProgressTemplate",
      entityId: template.id,
    });
  }

  return template;
}

export async function createItem(templateId: string, projectId: string, data: any) {
  let session;
  try { session = await requireProjectAccess(projectId); } catch { return { error: "Bạn không có quyền truy cập công trình này" }; }

  try {
    const maxOrder = await prisma.fieldProgressItem.findFirst({
      where: { templateId, parentId: data.parentId || null, deletedAt: null },
      orderBy: { sortOrder: "desc" },
    });
    
    const sortOrder = (maxOrder?.sortOrder ?? -1) + 1;

    const item = await prisma.fieldProgressItem.create({
      data: {
        templateId,
        projectId,
        parentId: data.parentId || null,
        level: data.level || 0,
        itemType: data.itemType,
        code: data.code,
        categoryName: data.categoryName,
        workContent: data.workContent,
        constructionCrew: data.constructionCrew,
        designQuantity: data.designQuantity ? Number(data.designQuantity) : null,
        unit: data.unit,
        note: data.note,
        sortOrder,
        createdById: session.id,
      }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "CREATE_FIELD_PROGRESS_ITEM",
      entityType: "FieldProgressItem",
      entityId: item.id,
      afterData: item
    });

    revalidatePath(`/projects/${projectId}/field-progress`);
    return { success: true, item };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateItem(itemId: string, projectId: string, data: any) {
  let session;
  try { session = await requireProjectAccess(projectId); } catch { return { error: "Bạn không có quyền truy cập công trình này" }; }

  try {
    const before = await prisma.fieldProgressItem.findUnique({ where: { id: itemId } });
    if (!before) return { error: "Item not found" };
    if (before.projectId !== projectId) return { error: "Item does not belong to this project" };

    const item = await prisma.fieldProgressItem.update({
      where: { id: itemId },
      data: {
        code: data.code,
        categoryName: data.categoryName,
        workContent: data.workContent,
        constructionCrew: data.constructionCrew,
        designQuantity: data.designQuantity !== undefined ? (data.designQuantity ? Number(data.designQuantity) : null) : undefined,
        unit: data.unit,
        note: data.note,
      }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "UPDATE_FIELD_PROGRESS_ITEM",
      entityType: "FieldProgressItem",
      entityId: item.id,
      beforeData: before,
      afterData: item
    });

    revalidatePath(`/projects/${projectId}/field-progress`);
    return { success: true, item };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteItem(itemId: string, projectId: string) {
  let session;
  try { session = await requireProjectAccess(projectId); } catch { return { error: "Bạn không có quyền truy cập công trình này" }; }

  try {
    const before = await prisma.fieldProgressItem.findUnique({ where: { id: itemId } });
    if (!before) return { error: "Item not found" };
    if (before.projectId !== projectId) return { error: "Item does not belong to this project" };

    const deletedTime = new Date();

    // Find children ids to soft-delete their entries as well
    const children = await prisma.fieldProgressItem.findMany({
      where: { parentId: itemId },
      select: { id: true }
    });
    const itemIds = [itemId, ...children.map(c => c.id)];

    const entries = await prisma.fieldProgressEntry.findMany({
      where: { itemId: { in: itemIds }, deletedAt: null }
    });
    if (entries.some(e => e.status === "APPROVED" || e.status === "SUBMITTED")) {
      return { error: "Không thể xóa hạng mục đã có khối lượng được trình duyệt hoặc phê duyệt." };
    }

    // Soft delete
    const item = await prisma.fieldProgressItem.update({
      where: { id: itemId },
      data: { deletedAt: deletedTime }
    });

    // Soft delete immediate children
    await prisma.fieldProgressItem.updateMany({
      where: { parentId: itemId },
      data: { deletedAt: deletedTime }
    });

    // Cascade soft delete entries
    await prisma.fieldProgressEntry.updateMany({
      where: { itemId: { in: itemIds }, deletedAt: null },
      data: { deletedAt: deletedTime }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "SOFT_DELETE_FIELD_PROGRESS_ITEM",
      entityType: "FieldProgressItem",
      entityId: item.id,
    });

    revalidatePath(`/projects/${projectId}/field-progress`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Bulk update for inline table editing
export async function batchUpdateItems(projectId: string, updates: any[]) {
  let session;
  try { session = await requireProjectAccess(projectId); } catch { return { error: "Bạn không có quyền truy cập công trình này" }; }

  try {
    const itemIds = updates.map(u => u.id);
    const existingItems = await prisma.fieldProgressItem.findMany({
      where: { id: { in: itemIds } }
    });
    if (existingItems.some(item => item.projectId !== projectId)) {
      return { error: "Some items do not belong to this project" };
    }

    // using a transaction to update multiple items
    await prisma.$transaction(
      updates.map(update => 
        prisma.fieldProgressItem.update({
          where: { id: update.id },
          data: {
            code: update.code,
            categoryName: update.categoryName,
            workContent: update.workContent,
            constructionCrew: update.constructionCrew,
            designQuantity: update.designQuantity ? Number(update.designQuantity) : null,
            unit: update.unit,
            note: update.note,
          }
        })
      )
    );

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "BATCH_UPDATE_FIELD_PROGRESS_ITEMS",
      entityType: "FieldProgressItem",
      entityId: "BATCH",
      afterData: updates
    });

    revalidatePath(`/projects/${projectId}/field-progress`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
