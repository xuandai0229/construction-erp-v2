"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { requireProjectAccess } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getWorkDateRange } from "@/lib/date/work-date";
import { evaluateVolumeGuard } from "@/lib/field-progress/volume-guard";
const Decimal = Prisma.Decimal;

// Safer batch save function
export async function batchSaveDailyEntries(projectId: string, templateId: string, entryDateStr: string, entries: any[], submit: boolean = false) {
  const session = await requireProjectAccess(projectId);

  try {
    const { start, end } = getWorkDateRange(entryDateStr);
    const status = "APPROVED";
    
    const itemIds = entries.map(e => e.itemId);

    // Fetch existing ACTIVE entries for this date
    const existing = await prisma.fieldProgressEntry.findMany({
      where: {
        templateId,
        deletedAt: null,
        entryDate: {
          gte: start,
          lt: end,
        },
      },
    });

    const existingByItemId = new Map<string, string[]>();
    for (const entry of existing) {
      if (!existingByItemId.has(entry.itemId)) {
        existingByItemId.set(entry.itemId, []);
      }
      existingByItemId.get(entry.itemId)!.push(entry.id);
    }

    // Fetch design quantities for validation
    const activeItems = await prisma.fieldProgressItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null },
      select: { id: true, designQuantity: true }
    });
    const itemsMap = new Map(activeItems.map(i => [i.id, Number(i.designQuantity || 0)]));

    // Fetch cumulative before today (APPROVED only — matches Daily display)
    const historicalSums = await prisma.fieldProgressEntry.groupBy({
      by: ["itemId"],
      where: {
        itemId: { in: itemIds },
        deletedAt: null,
        status: "APPROVED",
        entryDate: { lt: start }
      },
      _sum: { quantity: true }
    });
    const sumsMap = new Map(historicalSums.map(s => [s.itemId, Number(s._sum.quantity || 0)]));

    const operations = entries.flatMap(e => {
      const quantityNum = Number(e.quantity || 0);
      const quantity = new Decimal(quantityNum);
      if (quantity.lessThan(0)) throw new Error("Khối lượng không được âm");

      const existingIds = existingByItemId.get(e.itemId) || [];
      
      if (existingIds.length > 1) {
        throw new Error(
          `Phát hiện dữ liệu trùng lặp cho công việc (${e.itemId}) trong ngày đã chọn. ` +
          `Vui lòng chạy audit và xử lý dữ liệu trước khi nhập tiếp.`
        );
      }

      // Handle quantity = 0
      if (quantityNum === 0) {
        if (existingIds.length === 1) {
          // Soft-delete existing entry if quantity is set to 0
          return [
            prisma.fieldProgressEntry.update({
              where: { id: existingIds[0] },
              data: { deletedAt: new Date() }
            })
          ];
        }
        // If it doesn't exist, do nothing (don't create dirty 0-quantity entry)
        return [];
      }

      // Validate Volume Guard for quantity > 0
      const designQty = itemsMap.get(e.itemId) || 0;
      const cumulativeBefore = sumsMap.get(e.itemId) || 0;
      
      const guard = evaluateVolumeGuard({
        designQuantity: designQty,
        cumulativeBefore,
        todayQuantity: quantityNum,
        status,
        note: e.note,
        issueNote: e.issueNote,
        proposalNote: e.proposalNote
      });

      if (!guard.canSubmit) {
        throw new Error("Khối lượng sau khi lưu vượt giới hạn cho phép. Vui lòng nhập lý do phát sinh tối thiểu 10 ký tự hoặc điều chỉnh lại số liệu.");
      }
      
      if (existingIds.length === 1) {
        return [
          prisma.fieldProgressEntry.update({
            where: { id: existingIds[0] },
            data: {
              quantity,
              issueNote: e.issueNote,
              proposalNote: e.proposalNote,
              note: e.note,
              status,
              approvedAt: new Date(),
              submittedAt: null,
              deletedAt: null // Restore if it was previously soft-deleted (though our query filtered deletedAt: null anyway)
            }
          })
        ];
      } else {
        return [
          prisma.fieldProgressEntry.create({
            data: {
              projectId,
              templateId,
              itemId: e.itemId,
              entryDate: start,
              quantity,
              issueNote: e.issueNote,
              proposalNote: e.proposalNote,
              note: e.note,
              status,
              createdById: session.id,
              approvedAt: new Date()
            }
          })
        ];
      }
    });

    await prisma.$transaction(operations);

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "UPDATE_FIELD_PROGRESS_ENTRY",
      entityType: "FieldProgressEntry",
      entityId: entryDateStr,
      afterData: entries
    });

    revalidatePath(`/projects/${projectId}/field-progress`);
    revalidatePath(`/projects/${projectId}/field-progress/daily`);
    revalidatePath(`/projects/${projectId}/field-progress/summary`);
    revalidatePath(`/projects/${projectId}/field-progress`, "layout");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
